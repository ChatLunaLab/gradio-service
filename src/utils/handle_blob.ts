import {
    Command,
    type ApiData,
    type EndpointInfo,
    type JsApiData
} from '../types'
import { FileData } from '../upload'
import { updateObject, walkAndStoreBlobs, Client } from '..'
import {
    FILE_PROCESSING_ERROR_MSG,
    NODEJS_FS_ERROR_MSG,
    ROOT_URL_ERROR_MSG
} from '../constants'

export async function handleBlob(
    this: Client,
    endpoint: string,
    data: unknown[],
    apiInfo: EndpointInfo<JsApiData | ApiData>
): Promise<unknown[]> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this

    await processLocalFileCommands(self, data)

    const blobRefs = await walkAndStoreBlobs(data, undefined, [], true, apiInfo)

    const results = await Promise.all(
        blobRefs.map(async ({ path, blob, type }) => {
            if (!blob) return { path, type }

            const response = await self.uploadFiles(endpoint, [blob])
            const fileUrl = response.files && response.files[0]
            return {
                path,
                file_url: fileUrl,
                type,
                name:
                    typeof File !== 'undefined' && blob instanceof File
                        ? blob?.name
                        : undefined
            }
        })
    )

    results.forEach(({ path, file_url: fileUrl, type, name }) => {
        if (type === 'Gallery') {
            updateObject(data, fileUrl, path)
        } else if (fileUrl) {
            const file = new FileData({ path: fileUrl, orig_name: name })
            updateObject(data, file, path)
        }
    })

    return data
}

export async function processLocalFileCommands(
    client: Client,
    data: unknown[]
): Promise<void> {
    const root = client.config?.root || client.config?.root_url

    if (!root) {
        throw new Error(ROOT_URL_ERROR_MSG)
    }

    await recursivelyProcessCommands(client, data)
}

async function recursivelyProcessCommands(
    client: Client,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any,
    path: string[] = []
): Promise<void> {
    for (const key in data) {
        if (data[key] instanceof Command) {
            await processSingleCommand(client, data, key)
        } else if (typeof data[key] === 'object' && data[key] !== null) {
            await recursivelyProcessCommands(client, data[key], [...path, key])
        }
    }
}

async function processSingleCommand(
    client: Client,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any,
    key: string
): Promise<void> {
    const cmdItem = data[key] as Command
    const root = client.config?.root || client.config?.root_url

    if (!root) {
        throw new Error(ROOT_URL_ERROR_MSG)
    }

    try {
        let fileBuffer: Buffer
        let fullPath: string

        // check if running in a Node.js environment
        if (
            typeof process !== 'undefined' &&
            process.versions &&
            process.versions.node
        ) {
            const fs = await import('fs/promises')
            const path = await import('path')

            fullPath = path.resolve(process.cwd(), cmdItem.meta.path)
            fileBuffer = await fs.readFile(fullPath) // Read file from disk
        } else {
            throw new Error(NODEJS_FS_ERROR_MSG)
        }

        const file = new Blob([fileBuffer], {
            type: 'application/octet-stream'
        })

        const response = await client.uploadFiles(root, [file])

        const fileUrl = response.files && response.files[0]

        if (fileUrl) {
            const fileData = new FileData({
                path: fileUrl,
                orig_name: cmdItem.meta.name || ''
            })

            // replace the command object with the fileData object
            data[key] = fileData
        }
    } catch (error) {
        client.ctx.logger.error(FILE_PROCESSING_ERROR_MSG, error)
    }
}
