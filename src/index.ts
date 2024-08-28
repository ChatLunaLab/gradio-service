/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable max-len */
import { Client } from './client'
import { Context, Schema, Service } from 'koishi'

export * from './client'
export * from './constants'
export * from './helpers/index'
export * from './utils/index'
export * from './types'

class GradioClientService extends Service {
    constructor(ctx: Context) {
        super(ctx, 'gradio')
    }

    connect(
        url: string,
        options?: Parameters<(typeof Client)['connect']>['2']
    ) {
        return Client.connect(this.ctx, url, options)
    }
}

declare module 'koishi' {
    interface Context {
        gradio: GradioClientService
    }
}

export const inject = {}

namespace GradioClientService {
    export interface Config {}

    export const Config = Schema.object({})

    export const name = 'gradio-service'
}

export default GradioClientService
