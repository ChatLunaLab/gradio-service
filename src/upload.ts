import type { Client } from './client'

export async function upload(
    this: Client,
    fileData: FileData[],
    rootUrl: string,
    uploadId?: string,
    maxFileSize?: number
): Promise<(FileData | null)[] | null> {
    const files = (Array.isArray(fileData) ? fileData : [fileData]).map(
        (file_data) => file_data.blob!
    )

    const oversizedFiles = files.filter(
        (f) => f.size > (maxFileSize ?? Infinity)
    )
    if (oversizedFiles.length) {
        throw new Error(
            `File size exceeds the maximum allowed size of ${maxFileSize} bytes: ${oversizedFiles
                .map((f) => f.name)
                .join(', ')}`
        )
    }

    return await Promise.all(
        await this.uploadFiles(rootUrl, files, uploadId).then(
            async (response: { files?: string[]; error?: string }) => {
                if (response.error) {
                    throw new Error(response.error)
                } else {
                    if (response.files) {
                        return response.files.map((f, i) => {
                            const file = new FileData({
                                ...fileData[i],
                                path: f,
                                url: `${rootUrl}${this.apiPrefix}/file=${f}`
                            })
                            return file
                        })
                    }

                    return []
                }
            }
        )
    )
}

export async function prepareFiles(
    files: File[],
    isStream?: boolean
): Promise<FileData[]> {
    return files.map(
        (f) =>
            new FileData({
                path: f.name,
                orig_name: f.name,
                blob: f,
                size: f.size,
                mime_type: f.type,
                is_stream: isStream
            })
    )
}

export class FileData {
    path: string
    url?: string
    orig_name?: string
    size?: number
    blob?: File
    is_stream?: boolean
    mime_type?: string
    alt_text?: string
    readonly meta = { _type: 'gradio.FileData' }

    constructor({
        path,
        url,
        orig_name,
        size,
        blob,
        is_stream,
        mime_type,
        alt_text
    }: {
        path: string
        url?: string
        orig_name?: string
        size?: number
        blob?: File
        is_stream?: boolean
        mime_type?: string
        alt_text?: string
    }) {
        this.path = path
        this.url = url
        this.orig_name = orig_name
        this.size = size
        this.blob = url ? undefined : blob
        this.is_stream = is_stream
        this.mime_type = mime_type
        this.alt_text = alt_text
    }
}
