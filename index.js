#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BASE_URL = process.env.APIFOX_BASE_URL || "https://api.apifox.com";
const TOKEN = process.env.APIFOX_ACCESS_TOKEN;
const DEFAULT_PROJECT = process.env.APIFOX_PROJECT_ID;
const API_VERSION = "2024-03-28";

if (!TOKEN) {
  process.stderr.write("Error: APIFOX_ACCESS_TOKEN is required\n");
  process.exit(1);
}

function headers() {
  return {
    "Authorization": `Bearer ${TOKEN}`,
    "X-Apifox-Api-Version": API_VERSION,
    "Content-Type": "application/json",
  };
}

async function apifox(method, path, body) {
  const url = `${BASE_URL}/api${path}`;
  const opts = { method, headers: headers() };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text, status: res.status };
  }
}

function pid(projectId) {
  return projectId || DEFAULT_PROJECT;
}

const server = new McpServer({
  name: "apifox-crud",
  version: "1.0.0",
});

// ── 接口列表 ──────────────────────────────────────────────
server.tool(
  "list_apis",
  "列出项目中的所有接口（支持关键词搜索）",
  {
    projectId: z.string().optional().describe("项目ID，默认使用环境变量中的项目ID"),
    keyword: z.string().optional().describe("搜索关键词（接口名或路径）"),
  },
  async ({ projectId, keyword }) => {
    const p = pid(projectId);
    const qs = keyword ? `?keyword=${encodeURIComponent(keyword)}` : "";
    const data = await apifox("GET", `/v1/projects/${p}/http-apis${qs}`);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ── 获取接口详情 ──────────────────────────────────────────
server.tool(
  "get_api",
  "获取单个接口的完整详情",
  {
    projectId: z.string().optional().describe("项目ID"),
    apiId: z.number().describe("接口ID"),
  },
  async ({ projectId, apiId }) => {
    const p = pid(projectId);
    const data = await apifox("GET", `/v1/projects/${p}/http-apis/${apiId}`);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ── 获取接口目录树 ────────────────────────────────────────
server.tool(
  "get_api_tree",
  "获取接口目录树结构（目录+接口列表）",
  {
    projectId: z.string().optional().describe("项目ID"),
  },
  async ({ projectId }) => {
    const p = pid(projectId);
    const data = await apifox("GET", `/v1/projects/${p}/api-detail-folders`);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ── 创建接口 ──────────────────────────────────────────────
server.tool(
  "create_api",
  "在 Apifox 项目中创建新接口",
  {
    projectId: z.string().optional().describe("项目ID"),
    name: z.string().describe("接口名称"),
    method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"]).describe("HTTP 方法"),
    path: z.string().describe("接口路径，以 / 开头，如 /v1/users/{id}"),
    folderId: z.number().optional().describe("所属目录ID，0或不传表示根目录"),
    description: z.string().optional().describe("接口描述"),
    status: z.enum(["designing", "pending", "developing", "integrating", "testing", "released", "deprecated", "exception"]).optional().describe("接口状态，默认 developing"),
    tags: z.array(z.string()).optional().describe("标签列表"),
    parameters: z.object({
      path: z.array(z.any()).optional(),
      query: z.array(z.any()).optional(),
      header: z.array(z.any()).optional(),
      cookie: z.array(z.any()).optional(),
    }).optional().describe("请求参数（按位置分组）"),
    requestBody: z.any().optional().describe("请求体定义"),
    responses: z.array(z.any()).optional().describe("响应定义列表"),
  },
  async ({ projectId, name, method, path, folderId, description, status, tags, parameters, requestBody, responses }) => {
    const p = pid(projectId);
    const body = {
      name,
      method: method.toUpperCase(),
      path,
      folderId: folderId ?? 0,
      status: status ?? "developing",
      description: description ?? "",
      tags: tags ?? [],
      parameters: parameters ?? { path: [], query: [], header: [], cookie: [] },
      responses: responses ?? [],
    };
    if (requestBody) body.requestBody = requestBody;
    const data = await apifox("POST", `/v1/projects/${p}/http-apis`, body);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ── 更新接口 ──────────────────────────────────────────────
server.tool(
  "update_api",
  "更新 Apifox 项目中已有接口的信息",
  {
    projectId: z.string().optional().describe("项目ID"),
    apiId: z.number().describe("要更新的接口ID"),
    name: z.string().optional().describe("接口名称"),
    method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"]).optional().describe("HTTP 方法"),
    path: z.string().optional().describe("接口路径"),
    folderId: z.number().optional().describe("所属目录ID"),
    description: z.string().optional().describe("接口描述"),
    status: z.enum(["designing", "pending", "developing", "integrating", "testing", "released", "deprecated", "exception"]).optional().describe("接口状态"),
    tags: z.array(z.string()).optional().describe("标签列表"),
    parameters: z.any().optional().describe("请求参数（按位置分组）"),
    requestBody: z.any().optional().describe("请求体定义"),
    responses: z.array(z.any()).optional().describe("响应定义列表"),
  },
  async ({ projectId, apiId, ...fields }) => {
    const p = pid(projectId);
    const body = {};
    for (const [k, v] of Object.entries(fields)) {
      if (v !== undefined) body[k] = v;
    }
    if (body.method) body.method = body.method.toUpperCase();
    const data = await apifox("PUT", `/v1/projects/${p}/http-apis/${apiId}`, body);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ── 删除接口 ──────────────────────────────────────────────
server.tool(
  "delete_api",
  "删除 Apifox 项目中的接口",
  {
    projectId: z.string().optional().describe("项目ID"),
    apiId: z.number().describe("要删除的接口ID"),
  },
  async ({ projectId, apiId }) => {
    const p = pid(projectId);
    const data = await apifox("DELETE", `/v1/projects/${p}/http-apis/${apiId}`);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ── 目录列表 ──────────────────────────────────────────────
server.tool(
  "list_folders",
  "获取项目接口目录列表",
  {
    projectId: z.string().optional().describe("项目ID"),
  },
  async ({ projectId }) => {
    const p = pid(projectId);
    const data = await apifox("GET", `/v1/projects/${p}/api-detail-folders`);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ── 创建目录 ──────────────────────────────────────────────
server.tool(
  "create_folder",
  "创建接口目录",
  {
    projectId: z.string().optional().describe("项目ID"),
    name: z.string().describe("目录名称"),
    parentId: z.number().optional().describe("父目录ID，0或不传表示根目录"),
  },
  async ({ projectId, name, parentId }) => {
    const p = pid(projectId);
    const data = await apifox("POST", `/v1/projects/${p}/api-tree-folders`, {
      name,
      parentId: parentId ?? 0,
    });
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ── 导入 OpenAPI ──────────────────────────────────────────
server.tool(
  "import_openapi",
  "将 OpenAPI/Swagger 规范导入到 Apifox 项目",
  {
    projectId: z.string().optional().describe("项目ID"),
    spec: z.string().describe("OpenAPI 规范内容（JSON 或 YAML 字符串）"),
    targetFolderId: z.number().optional().describe("目标目录ID，默认根目录"),
    coverExistApi: z.boolean().optional().describe("是否覆盖已有同路径接口，默认 true"),
    syncFolder: z.boolean().optional().describe("是否同步目录结构，默认 true"),
  },
  async ({ projectId, spec, targetFolderId, coverExistApi, syncFolder }) => {
    const p = pid(projectId);
    const body = {
      input: spec,
      inputType: "openapi",
      options: {
        targetFolderId: targetFolderId ?? 0,
        coverExistApi: coverExistApi ?? true,
        coverExistSchema: true,
        syncFolder: syncFolder ?? true,
      },
    };
    const data = await apifox("POST", `/v1/projects/${p}/import-data`, body);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ── 导出 OpenAPI ──────────────────────────────────────────
server.tool(
  "export_openapi",
  "从 Apifox 项目导出 OpenAPI 规范",
  {
    projectId: z.string().optional().describe("项目ID"),
    version: z.enum(["3.1", "3.0", "2.0"]).optional().describe("OpenAPI 版本，默认 3.1"),
    format: z.enum(["JSON", "YAML"]).optional().describe("导出格式，默认 JSON"),
  },
  async ({ projectId, version, format }) => {
    const p = pid(projectId);
    const body = {
      scope: { type: "ALL" },
      oasVersion: version ?? "3.1",
      exportFormat: format ?? "JSON",
    };
    const data = await apifox("POST", `/v1/projects/${p}/export-openapi`, body);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ── 项目信息 ──────────────────────────────────────────────
server.tool(
  "get_project",
  "获取项目基本信息",
  {
    projectId: z.string().optional().describe("项目ID"),
  },
  async ({ projectId }) => {
    const p = pid(projectId);
    const data = await apifox("GET", `/v1/projects/${p}`);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ── 数据模型列表 ──────────────────────────────────────────
server.tool(
  "list_schemas",
  "获取项目数据模型列表",
  {
    projectId: z.string().optional().describe("项目ID"),
  },
  async ({ projectId }) => {
    const p = pid(projectId);
    const data = await apifox("GET", `/v1/projects/${p}/schemas`);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ── 创建数据模型 ──────────────────────────────────────────
server.tool(
  "create_schema",
  "创建数据模型",
  {
    projectId: z.string().optional().describe("项目ID"),
    name: z.string().describe("模型名称"),
    jsonSchema: z.any().describe("JSON Schema 定义对象"),
    folderId: z.number().optional().describe("所属目录ID"),
    description: z.string().optional().describe("模型描述"),
  },
  async ({ projectId, name, jsonSchema, folderId, description }) => {
    const p = pid(projectId);
    const body = { name, jsonSchema, folderId: folderId ?? 0, description: description ?? "" };
    const data = await apifox("POST", `/v1/projects/${p}/schemas`, body);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ── 启动 ─────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);
