/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable max-len */
import { Client } from './client'
import { Context, Schema, Service } from 'koishi'
import * as eventStream from '@dingyi222666/event-stream'
import { ClientOptions } from './types'

export * from './client'
export * from './constants'
export * from './helpers/index'
export * from './utils/index'
export * from './types'

class GradioClientService extends Service {
    constructor(
        public ctx: Context,
        public config: GradioClientService.Config
    ) {
        super(ctx, 'gradio')
        ctx.plugin(eventStream)
    }

    connect(url: string, options?: ClientOptions) {
        return Client.connect(this.ctx, url, {
            ...options
        })
    }
}

declare module 'koishi' {
    interface Context {
        gradio: GradioClientService
    }
}

export const inject = {}

namespace GradioClientService {
    export interface Config {
        baseURL: string
    }

    export const Config = Schema.object({
        baseURL: Schema.string()
            .role('url')
            .default('https://huggingface.co')
            .description('huggingface 的 base url')
    })

    export const name = 'gradio-service'
}

export default GradioClientService
