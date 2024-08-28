<div align="center">

# koishi-plugin-gradio-service

_提供 @gradio/client 支持_

## [![npm](https://img.shields.io/npm/v/koishi-plugin-gradio-service)](https://www.npmjs.com/package/koishi-plugin-gradio-service) [![npm](https://img.shields.io/npm/dm/koishi-plugin-gradio-service)](https://www.npmjs.com/package/koishi-plugin-gradio-service) ![node version](https://img.shields.io/badge/node-%3E=18-green) ![github top language](https://img.shields.io/github/languages/top/ChatLunaLab/chatluna-character?logo=github)

</div>

## 特性

Fork 自 [@gradio/client](https://github.com/gradio-app/gradio/tree/2b6cbf25908e42cf027324e54ef2cc0baad11a91/client/js)，裁剪了一些支持，并且支持了 Koishi 的 HTTP 服务。

其中以下功能未实现：

- 上传文件
- duplicate


## 使用

```typescript
import type {  } from "koishi-plugin-gradio-service"

const app = ctx.gradio.connect(".....")

```
