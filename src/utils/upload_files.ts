import { HTTP } from 'koishi'
import type { Client } from '..'
import { BROKEN_CONNECTION_MSG, UPLOAD_URL } from '../constants'
import type { UploadResponse } from '../types'

export async function uploadFiles(
    this: Client,
    rootUrl: string,
    files: (Blob | File)[],
    uploadId?: string
): Promise<UploadResponse> {
    const headers: {
        Authorization?: string
    } = {}
    if (this?.options?.hf_token) {
        headers.Authorization = `Bearer ${this.options.hf_token}`
    }

    const chunkSize = 1000
    const uploadResponses = []
    let response: HTTP.Response

    for (let i = 0; i < files.length; i += chunkSize) {
        const chunk = files.slice(i, i + chunkSize)
        const formData = new FormData()
        chunk.forEach((file) => {
            formData.append('files', file)
        })
        try {
            const uploadUrl = uploadId
                ? `${rootUrl}${this.apiPrefix}/${UPLOAD_URL}?upload_id=${uploadId}`
                : `${rootUrl}${this.apiPrefix}/${UPLOAD_URL}`

            response = await this.ctx.http(uploadUrl, {
                method: 'POST',
                data: formData,
                headers
            })
        } catch (e) {
            throw new Error(BROKEN_CONNECTION_MSG + (e as Error).message)
        }
        if (response.status !== 200) {
            const errorText = await response.data
            return { error: `HTTP ${response.status}: ${errorText}` }
        }
        const output: UploadResponse['files'] = await response.data
        if (output) {
            uploadResponses.push(...output)
        }
    }
    return { files: uploadResponses }
}
