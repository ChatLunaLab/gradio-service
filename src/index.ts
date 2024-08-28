/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable max-len */
import { Context, Schema, Service } from 'koishi'
import { Client } from '@gradio/client'

export * from '@gradio/client'
class GradioClientService extends Service {
    constructor(ctx: Context) {
        super(ctx, 'gradio')
    }

    connect(...args: Parameters<(typeof Client)['connect']>) {
        return Client.connect(...args)
    }

    duplicate(...args: Parameters<(typeof Client)['duplicate']>) {
        return Client.duplicate(...args)
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
