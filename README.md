# apifox-crud-mcp

基于 Apifox Open API 封装的 MCP Server，支持接口的完整 CRUD 操作。

## 功能

| 工具 | 说明 |
|------|------|
| `list_apis` | 列出项目所有接口（支持关键词搜索） |
| `get_api` | 获取单个接口详情 |
| `get_api_tree` | 获取接口目录树 |
| `create_api` | 创建新接口 |
| `update_api` | 更新已有接口 |
| `delete_api` | 删除接口 |
| `list_folders` | 列出目录 |
| `create_folder` | 创建目录 |
| `import_openapi` | 导入 OpenAPI/Swagger 规范 |
| `export_openapi` | 导出 OpenAPI 规范 |
| `get_project` | 获取项目信息 |
| `list_schemas` | 列出数据模型 |
| `create_schema` | 创建数据模型 |

## 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `APIFOX_ACCESS_TOKEN` | 是 | Apifox Personal Access Token |
| `APIFOX_PROJECT_ID` | 否 | 默认项目 ID（工具调用时可覆盖） |
| `APIFOX_BASE_URL` | 否 | API 地址，默认 `https://api.apifox.com` |

## 安装

```bash
npm install
```

## 在 Claude Code 中注册（全局）

```bash
claude mcp add apifox-crud -s user -- node D:/Work/Code/apifox-crud-mcp/index.js
```

然后设置环境变量（编辑 `~/.claude.json` 中对应条目的 `env` 字段）：

```json
{
  "APIFOX_ACCESS_TOKEN": "your_token",
  "APIFOX_PROJECT_ID": "your_project_id"
}
```

## 在项目 `.mcp.json` 中注册

```json
{
  "mcpServers": {
    "apifox-crud": {
      "command": "node",
      "args": ["D:/Work/Code/apifox-crud-mcp/index.js"],
      "env": {
        "APIFOX_ACCESS_TOKEN": "your_token",
        "APIFOX_PROJECT_ID": "your_project_id"
      }
    }
  }
}
```

## API 端点参考

基础地址：`https://api.apifox.com/api/v1/`

- 接口 CRUD：`/projects/{id}/http-apis`
- 目录列表：`/projects/{id}/api-detail-folders`
- 创建目录：`/projects/{id}/api-tree-folders`
- 导入数据：`/projects/{id}/import-data`
- 导出：`/projects/{id}/export-openapi`
- 数据模型：`/projects/{id}/schemas`
