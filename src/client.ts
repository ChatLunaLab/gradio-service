/* eslint-disable @typescript-eslint/naming-convention */
import { Context } from 'koishi'
import {
    ApiData,
    ApiInfo,
    ClientOptions,
    Config,
    EndpointInfo,
    FileData,
    GradioEvent,
    JsApiData,
    PostResponse,
    PredictReturn,
    Status,
    SubmitIterable,
    UploadResponse
} from './types'
import { processEndpoint } from './helpers/api_info'
import { API_INFO_ERROR_MSG, CONFIG_ERROR_MSG } from './constants'
import {
    getJwt,
    mapNamesToIds,
    parseAndSetCookies,
    resolveConfig,
    resolveCookies
} from './helpers/init_helpers'
import { viewApi } from './utils/view_api'
import { closeStream, openStream, readableStream } from './utils/stream'
import { postData } from './utils/post_data'
import { submit } from './utils/submit'
import { predict } from './utils/predict'
import { uploadFiles } from './utils/upload_files'
import { handleBlob } from './utils/handle_blob'

export class Client {
    appReference: string
    options: ClientOptions

    config: Config | undefined
    apiInfo: ApiInfo<JsApiData> | undefined
    apiMap: Record<string, number> = {}
    session_hash: string = Math.random().toString(36).substring(2)
    jwt: string | false = false
    lastStatus: Record<string, Status['stage']> = {}

    private cookies: string | null = null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private _resolveConfig: (url: string) => Promise<any>
    private resolveCookie: () => Promise<void>
    viewApi: () => Promise<ApiInfo<JsApiData>>
    openStream: () => Promise<void>

    postData: (
        url: string,
        data: unknown,
        headers?: Headers
    ) => Promise<[PostResponse, number]>

    submit: (
        endpoint: string | number,
        data: unknown[] | Record<string, unknown> | undefined,
        event_data?: unknown,
        trigger_id?: number | null,
        all_events?: boolean
    ) => SubmitIterable<GradioEvent>

    predict: (
        endpoint: string | number,
        data: unknown[] | Record<string, unknown> | undefined,
        event_data?: unknown
    ) => Promise<PredictReturn>

    uploadFiles: (
        root_url: string,
        files: (Blob | File)[],
        upload_id?: string
    ) => Promise<UploadResponse>

    upload: (
        file_data: FileData[],
        root_url: string,
        upload_id?: string,
        max_file_size?: number
    ) => Promise<(FileData | null)[] | null>

    handleBlob: (
        endpoint: string,
        data: unknown[],
        endpoint_info: EndpointInfo<ApiData | JsApiData>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) => Promise<any[]>

    // streaming
    streamStatus = { open: false }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pendingStreamMessages: Record<string, any[][]> = {}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pendingDiffStreams: Record<string, any[][]> = {}
    eventCallbacks: Record<string, (data?: unknown) => Promise<void>> = {}
    unclosedEvents: Set<string> = new Set()

    abortController: AbortController | null = null
    streamInstance: EventSource | null = null

    constructor(
        public ctx: Context,
        appReference: string,
        options: ClientOptions = { events: ['data'] }
    ) {
        this.appReference = appReference
        if (!options.events) {
            options.events = ['data']
        }

        this.options = options

        this._resolveConfig = resolveConfig.bind(this)
        this.resolveCookie = resolveCookies.bind(this)
        this.viewApi = viewApi.bind(this)
        this.openStream = openStream.bind(this)
        this.postData = postData.bind(this)
        this.submit = submit.bind(this)
        this.predict = predict.bind(this)
        this.uploadFiles = uploadFiles.bind(this)
        this.handleBlob = handleBlob.bind(this)

        ctx.on('dispose', () => {
            this.close()
        })
    }

    async init() {
        if (this.options.auth) {
            await this.resolveCookie()
        }

        await this.resolveConfig()

        this.apiInfo = await this.viewApi()
        this.apiMap = mapNamesToIds(this.config?.dependencies || [])
    }

    async resolveConfig() {
        if (this.config) {
            return this.config
        }

        const { http_protocol: protocol, host } = await processEndpoint(
            this.ctx,
            this.appReference,
            this.options.hf_token
        )
        // REMOVE SPACE CHECK

        const { status_callback: statusCallback } = this.options

        let config: Config | undefined

        try {
            config = await this._resolveConfig(`${protocol}//${host}`)

            if (!config) {
                throw new Error(CONFIG_ERROR_MSG)
            }

            return this._configSuccess(config)
        } catch (e: unknown) {
            if (statusCallback)
                statusCallback({
                    status: 'error',
                    message: 'Could not load this space.',
                    load_status: 'error',
                    detail: 'NOT_FOUND'
                })
            throw e
        }
    }

    private async _configSuccess(_config: Config): Promise<Config> {
        this.config = _config

        if (this.config.auth_required) {
            return _config
        }

        if (_config.space_id && this.options.hf_token) {
            this.jwt = await getJwt(
                this.ctx,
                this.config.space_id,
                this.options.hf_token
            )

            this.ctx.setTimeout(
                () => {
                    this.jwt = false
                },
                1000 * 60 * 30
            )
        }

        try {
            this.apiInfo = await this.viewApi()
        } catch (e) {
            this.ctx.logger.error(API_INFO_ERROR_MSG + (e as Error).message)
        }

        return _config
    }

    stream(url: URL): EventSource {
        const headers = new Headers()
        if (this && this.cookies) {
            headers.append('Cookie', this.cookies)
        }

        this.abortController = new AbortController()

        this.streamInstance = readableStream(this.ctx, url.toString(), {
            credentials: 'include',
            headers,
            signal: this.abortController.signal
        })

        return this.streamInstance
    }

    public setCookies(cookies: string): void {
        this.cookies = parseAndSetCookies(cookies).join('; ')
    }

    static async connect(ctx: Context, url: string, options?: ClientOptions) {
        const client = new Client(ctx, url, options)

        await client.init()

        return client
    }

    close(): void {
        closeStream(this.streamStatus, this.abortController)
    }
}
