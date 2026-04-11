# Zakkart 供应链管理系统 — 项目上下文

> 本文件供 AI 编码工具自动读取，每次对话开始时提供项目背景。
> 由开发者维护，随开发进度更新。

---

## 项目概要

为亚马逊跨境电商品牌 Zakkart 搭建的后端供应链管理系统。覆盖「下采购订单 → 合同签署 → 生产跟踪 → 验货 → 发货物流 → 组装厂收货/组装 → 成品出库 → 货代交付」全链路。

核心用户：甲方管理员（PC 端）、供应商/组装厂（微信小程序）、临时司机（H5 扫码）。

## 技术栈

| 层 | 技术 |
|---|---|
| PC 端 | Vue 3 + Element Plus + Vite + Pinia |
| 小程序 | 微信原生（非 uni-app） |
| 司机 H5 | 轻量 HTML + CSS + JS（无框架） |
| 后端 | 微信云开发（云函数 Node.js 16+，Serverless） |
| 数据库 | 微信云数据库（NoSQL 文档型，20 个集合） |
| 文件存储 | 微信云存储 |
| 短信 | 腾讯云短信（已开通，签名和模板已审核通过） |
| 电子签 | 外部 SaaS（法大大/e签宝），系统只做 Word 导出和已签署 PDF 上传归档 |

## 关键技术决策（已确定，不要重新建议）

1. **不使用 HTTP 触发器**：PC 端和 H5 均通过 `@cloudbase/js-sdk` 调用云函数，与小程序 `wx.cloud.callFunction()` 共用同一个 `api` 云函数
2. **两层认证**：传输层（小程序自带 / PC+H5 匿名登录 `signInAnonymously`）+ 业务层（JWT 通过 `data.token` 传入，云函数中间件统一校验）
3. **数据库用 NoSQL，不用 MySQL**：`02-数据库设计.md` 为 NoSQL 20 个集合的开发依据
4. **单入口云函数 + 路由分发**：避免冷启动碎片化。API 调用方式：`callFunction({ name: 'api', data: { action: 'module.method', token: 'jwt', params: {...} } })`
5. **文件上传**：前端直传云存储（`wx.cloud.uploadFile` / `tcb.uploadFile`），云函数只接收 fileID 写入文档
6. **合同模板方案**：甲方/乙方信息自动填充（来自系统数据），付款比例和件数手动输入，通用条款统一（所有合同一致）
7. **初始数据来源**：`admin/src/data/products.js` 和 `suppliers.js` 中的硬编码数据作为种子数据导入，地址/银行信息等通过 PC 端表单后续填写
8. **ID 类型**：全部使用字符串（NoSQL `_id` 为字符串），示例格式如 `"product_001"`、`"org_001"`

## 云开发环境

| 项 | 值 |
|---|---|
| 小程序 AppID | `wxdbb8a93d15b72596` |
| 云开发环境 ID | `cloud1-0g855x4wc43be3c4` |
| 套餐 | 个人版（有效期至 2026-07-02） |
| 密钥配置 | 项目根目录 `.env` 文件（已加入 .gitignore） |

## 编码约定

| 项 | 约定 |
|---|---|
| 语言 | JavaScript (ES2020+)，云函数 Node.js 16+ |
| 集合名 | snake_case（如 `delivery_batches`） |
| JS 变量 | camelCase |
| 常量 | UPPER_SNAKE_CASE |
| API action 格式 | `模块.方法`（如 `product.list`、`contract.create`） |
| 错误码 | 0=成功，400/401/403/404/409/500 |
| 时间格式 | ISO 8601 UTC，前端按本地时区显示 |
| 文件上传 | 前端直传云存储，云函数只接收 fileID |
| ID 类型 | 全部字符串，格式如 `"product_001"`、`"org_001"` |

## 协作偏好

- 若微信开发者工具 GUI / 云后台可直接完成操作，优先由人工手动执行，不优先继续深挖 CLI 自动化
- CLI 可用于只读查询与快速校验，但遇到云开发部署、签名、缓存、上传等不稳定问题时，应及时转为人工 GUI 操作
- 当前项目的云函数部署已验证存在 DevTools CLI 不稳定问题：`getCloudAPISignedHeader failed (ret 41002)` 可通过重新登录 + 清缓存恢复，但全量部署仍可能触发 `EISDIR`

## 项目目录结构

```
跨境电商/
├── admin/                  # PC 端（Vue 3 + Element Plus）
│   └── src/views/          # 页面 P01-P19
├── miniprogram/            # 微信小程序（原生）
│   └── pages/              # 页面 M01-M16
├── cloudfunctions/         # 云函数（后端）
│   └── api/                # 主 API 函数（单入口）
├── h5/                     # 司机 H5 页面 —— 待创建
├── scripts/                # 工具脚本（含种子数据生成）
├── docs/                   # 文档
│   ├── 01-PRD-产品需求文档.md
│   └── 技术设计文档/
│       ├── 02-数据库设计.md      # NoSQL 20 个集合文档结构（v1.1，开发依据）
│       ├── 03-API接口设计.md
│       ├── 04-页面交互清单.md
│       └── 05-开发计划.md        # 开发依据（含 NoSQL 集合设计）
├── .env                    # 密钥配置（不提交 Git）
├── CLAUDE.md               # 本文件
└── todo_list.md            # 开发前待办追踪
```

## 文档索引

| 文档 | 路径 | 用途 |
|------|------|------|
| PRD | `docs/01-PRD-产品需求文档.md` | 业务需求、角色权限、功能清单 |
| 数据库设计（NoSQL） | `docs/技术设计文档/02-数据库设计.md` | 20 个集合文档结构、枚举值、嵌入策略、事务约束、索引（v1.1） |
| API 接口设计 | `docs/技术设计文档/03-API接口设计.md` | 95 个接口定义、两层认证、请求/响应格式、通知触发矩阵（v0.5） |
| 页面交互清单 | `docs/技术设计文档/04-页面交互清单.md` | PC 19 页 + 小程序 16 页 + H5 2 页（v0.3） |
| 开发计划 | `docs/技术设计文档/05-开发计划.md` | 8 个阶段的任务分解，含阶段 3.5 库存引擎（v0.4） |
| 待办追踪 | `todo_list.md` | 开发前待确认事项和进度 |

---

## 当前开发状态

### 阶段：阶段 4 联调中 + 权限/库存一期补齐（2026-04-11）

**已完成：**
- [x] PRD 定稿（v0.4）
- [x] 技术设计文档完成（数据库/API/页面交互/开发计划）
- [x] 小程序企业认证完成
- [x] 短信服务签名和模板审核通过
- [x] PC 端原型（admin/ 下 5 个页面，硬编码数据）
- [x] 小程序原型（miniprogram/ 下约 28 个页面骨架）
- [x] 密钥信息收集完毕（.env）
- [x] 开发前待办事项梳理完毕（todo_list.md）
- [x] 项目根目录 Git 初始化，版本管理统一到根目录（`admin/.git` 已做本地备份）
- [x] 阶段 0 后端骨架已创建：`cloudfunctions/api/` 单入口云函数、路由分发、统一响应、开发期短信登录、JWT 签发/校验
- [x] PC 端阶段 0 首批接入完成：Pinia、登录页、路由守卫、CloudBase SDK 调用封装、正式菜单骨架
- [x] 小程序阶段 0 首批接入完成：`wx.cloud.init`、统一 `callApi` 封装、正式登录页入口
- [x] 部署辅助文件已生成：`deploy-packages/api-cloudfunction.zip`、`deploy-packages/api-cloudfunction-env.json`
- [x] `api` 云函数已重新上传并部署到云开发环境
- [x] `api` 云函数环境变量已配置完成
- [x] PC 端登录链路已通过：`localhost:5173` 可登录并进入 Dashboard
- [x] 阶段 1 后端 3 个主数据路由模块完成：`product.*` 9 个 action、`organization.*` 10 个 action、`address.*` 5 个 action
- [x] `wx-server-sdk` 已接入云函数，`cloudfunctions/api/config/database.js` 已完成云数据库初始化与集合访问封装
- [x] 种子数据脚本已完成：`scripts/seed-data.js` 可生成 `organizations / part_types / products / users` 四份 JSON
- [x] PC 端阶段 1 页面改造完成：产品列表、产品详情、供应商列表切换到 API
- [x] PC 端阶段 1 新页面完成：供应商详情（5 Tab）、地址管理
- [x] PC 端阶段 1 补齐：产品完整 CRUD UI（新增产品、SKU 增删改、BOM 增删改、产品删除）
- [x] PC 端阶段 1 补齐：新增 `配件主数据` 模块，`part_types` 可在后台直接维护并供 BOM 引用
- [x] 导航信息架构已收敛：一级菜单按业务分组显示，`地址管理` 降为“系统 -> 地址中心”
- [x] 阶段 2/5 原型页已从验收界面下线：订单生成、库存管理改为 `ComingSoonView`，旧 FBA / 库存模拟数据与旧订单原型文件已移除
- [x] 本地验证通过：`npm run build`、`node scripts/seed-data.js`、云函数 JS syntax check
- [x] 阶段 1 收尾修补已完成：云数据库关键字查询改为 `db.RegExp`、`auth.smsLogin`/`auth.me` 优先查 `users` 集合、产品详情配件类别真实显示、地址更新去除 `_id`

- [x] 阶段 2 后端 3 个路由模块完成：`contract.*` 6 个 action、`order.generate` 1 个 action、`batch.*` 4 个 action
- [x] PC 端阶段 2 服务层完成：`contract.js`、`order.js`、`batch.js`
- [x] PC 端阶段 2 页面完成：订单生成（BOM 拆解+按供应商分组）、合同列表（状态筛选+分页）、合同详情（明细编辑+交付批次+Word 导出+PDF 上传）
- [x] Word 导出功能完成：使用 `docx` 库前端生成合同 Word，含甲乙方信息、产品明细表、付款条款、交付计划、通用条款、签章区
- [x] 本地验证通过：`npm run build`、云函数 JS syntax check
- [x] 部署 ZIP 已更新：`deploy-packages/api-cloudfunction.zip` 含新增 contract/order/batch 三个路由
- [x] 阶段 2 收口完成：订单生成页已切回真实 `order.generate`，已签 PDF 改为 PC 端直传云存储后归档
- [x] 阶段 2 小程序最小查看链路已接入：供应商首页、合同列表、合同详情改为真实 API
- [x] 阶段 3 后端首批完成：新增 `status.markProduced`、`inspection.list`、`inspection.create`
- [x] 阶段 3 PC 端首批完成：`质检管理` 列表页 + 验货详情/提交页已替换 `ComingSoonView`
- [x] 阶段 3 小程序最小链路完成：供应商可查看生产任务、标记已生产、查看验货反馈
- [x] 小程序阶段 1-3 主要入口去 mock 化：管理员首页、产品列表/详情、供应商列表/详情、通知页已切换为真实数据；发货页移除 mock 运单并明确标记为阶段 4
- [x] 阶段 3 收口完成：质检状态文案统一、空态提示补齐、小程序移除 `quality/confirm` 原型入口、质检附件支持图片/视频展示
- [x] 合同轻确认第一版完成：新增 `contract.confirm`，供应商可在小程序合同详情中“确认内容无误”，管理员可收到“待发起签约”待办提示
- [x] 小程序已签 PDF 查看能力完成：通过云存储临时链接 + `openDocument` 打开合同 PDF
- [x] 订单生成/合同管理边界已理顺：订单生成页负责“保存草稿 / 推送确认 / 导出 Word”，合同管理负责后续状态跟踪与签署归档
- [x] 合同动作已拆分：`导出 Word` 不再隐式改变状态，新增 `contract.pushConfirm` 专门发起供应商确认
- [x] 阶段 4 后端首批骨架完成：新增 `shipment.*`、`receiving.pending`、`h5.*`、`freightDocument.*`
- [x] 阶段 3.5 最小库存底层已补：收货确认可对组装厂执行最小入库，并写入 `inventory_change_logs`
- [x] 小程序阶段 4 首批接入完成：`shipping/list/create/detail/confirm` 已切真实 API，合同详情支持对 `PENDING_SHIPMENT` 明细发起发货
- [x] PC 端阶段 4 首批接入完成：发货管理列表/详情、货代单据页已替换 `ComingSoonView`
- [x] 司机 H5 最小静态页已创建：`h5/shipment/` 可基于 `h5_token` 调 `h5.shipmentInfo` / `h5.driverStep1` / `h5.driverStep2`
- [x] 供应商侧入口已收口一版：首页“待发货”与“待标记已生产”拆分，纠正“待交付批次”统计口径
- [x] 发货地址/目的地规则已补：创建发货单页会按产品类型/组织能力过滤组装厂或货代地址
- [x] 供应商自助成员管理已接入：小程序“我的组织与成员”支持查看成员、添加成员、编辑权限（负责人或有 `manage_members` 权限）
- [x] 主数据 IA 已按一期验收意见调整：`库存管理` 挪入“基础资料”，`配件主数据` 更名为“配件管理”
- [x] 配件管理已补扩展字段：`material / color / weight / size`，并支持全量编辑、差量分批保存，避免云函数 3 秒超时
- [x] 供应商管理已新增“原材料管理”Tab，可按供应商维护合同原材料映射文本
- [x] 合同编辑能力已升级：甲乙方信息、条款、表格均支持全量修改；采购货物说明支持删行
- [x] 合同在线查阅能力已补齐：PC 端与小程序在签署前可查看合同原文，签署后可查看归档 PDF
- [x] 合同正文表格已改为双表结构：`采购结算主表` + `规格说明表`，避免 PC 端与 Word 导出横向溢出/错行
- [x] 地址入口已按验收意见收敛：取消独立“地址中心”导航入口，货代地址改为“物流与发货 -> 货代地址维护”
- [x] 发货映射规则当前保持现状：系统仍按地址类型筛选 `assembly / freight`，暂未实现“组装厂绑定特定货代”
- [x] 小程序原型模式已下线：移除角色切换入口、原型 fallback 与 `role-select` 页面，正式环境仅保留手机号验证码登录
- [x] 合同签署上传后已支持按合同内结构化交付计划自动生成真实批次，供应商侧可直接进入“待生产”
- [x] 合同交付日期录入已统一改为日期选择器，保存格式固定为 `YYYY-MM-DD`
- [x] 甲方权限基础已补齐一版：PC 端新增 `甲方权限管理`，支持按模块给甲方成员/第三方质检人员授权
- [x] 甲方小程序质检提交流程已补齐：管理员可在移动端直接提交验货结果，并上传现场图片/视频
- [x] PC 端库存管理一期已上线：仅面向组装厂，支持配件/成品库存录入与库存流水查看
- [x] 甲方小程序库存页已切到真实接口，去除旧 mock 库存展示
- [x] 权限边界已补强：`inspection.*`、`status.markProduced`、`inventory.*`、`adminUser.*` 已接入模块权限校验

**进行中：**
- [x] 阶段 2 云端部署与联调
  - GUI 已完成 `api` 云函数重部署
  - 合同主链路已验证：选产品 → 生成合同 → 导出 Word → 上传已签署 PDF → 小程序查看合同记录
- [x] 阶段 3 云端联调
  - 小程序手机号验证码登录已验证可用
  - 生产/验货主链路已验证：供应商标记已生产 → PC 端待验货列表出现 → 管理员提交验货结果 → 小程序查看验货反馈
- [ ] 阶段 4 云端部署与联调
  - 待部署最新 `api` 云函数并验证：创建发货单 → 甲方确认数量 → 司机 H5 两步扫码 → 组装厂确认收货 / 跟单员确认到货代
  - 待在微信开发者工具重新编译小程序，验证 `shipping/*` 新页面和收货照片上传链路
  - 待给 H5 准备实际可扫码地址，并配置 `H5_BASE_URL`

**下一步：**
- 用最新代码重新部署 `api` 云函数并做阶段 4 联调
- 逐项验证阶段 4 闭环：创建发货单 → 数量确认 → 司机两步扫码 → 收货/到货代确认
- 阶段 4 最新代码已补正式 `notification.*` 读写与货代确认到达收口，下一步以云端联调为主
- 交付计划变更审批、库存调整双向确认、发货差异自动顺延仍未实现，作为下一阶段单独设计与开发

### 今日代码落点（2026-04-11）

- 后端新增：`cloudfunctions/api/routes/contract.js`、`cloudfunctions/api/routes/order.js`、`cloudfunctions/api/routes/batch.js`
- 后端新增：`cloudfunctions/api/routes/status.js`、`cloudfunctions/api/routes/inspection.js`
- 后端新增：`cloudfunctions/api/utils/access.js`、`cloudfunctions/api/utils/batch-parts.js`
- 后端修改：`cloudfunctions/api/router.js`（注册 contract/order/batch/status/inspection）
- 后端修复：`contract.uploadSigned` 兼容旧数据中 `snapshot: null` 的合同，避免上传已签 PDF 时数据库更新报错
- PC 端新增：`admin/src/services/contract.js`、`admin/src/services/order.js`、`admin/src/services/batch.js`
- PC 端新增：`admin/src/views/orders/OrderGenerate.vue`、`admin/src/views/contracts/ContractList.vue`、`admin/src/views/contracts/ContractDetail.vue`
- PC 端新增：`admin/src/services/status.js`、`admin/src/services/inspection.js`
- PC 端新增：`admin/src/views/quality/QualityList.vue`、`admin/src/views/quality/QualityDetail.vue`
- PC 端新增：`admin/src/utils/contractWord.js`（Word 导出）
- PC 端修改：`admin/src/router/index.js`（注册合同/订单/质检页面）、`admin/src/layouts/AdminLayout.vue`（更新阶段标注）
- 小程序修改：`miniprogram/app.js`、`pages/home/supplier/*`、`pages/contract/*`、`pages/quality/*`（切换真实 API）
- 小程序修改：`pages/home/admin/*`、`pages/product/*`、`pages/supplier-mgmt/*`、`pages/notification/*`（去除阶段 1-3 mock 数据）
- 部署文件：`deploy-packages/api-cloudfunction.zip`（已更新）
- 后端新增：`cloudfunctions/api/routes/shipment.js`、`receiving.js`、`h5.js`、`freight.js`
- 后端新增：`cloudfunctions/api/routes/notification.js`
- 后端新增：`cloudfunctions/api/utils/shipment.js`、`inventory.js`
- 后端修改：`cloudfunctions/api/routes/status.js`（新增 `status.requireReinspect`）、`cloudfunctions/api/router.js`（注册阶段 4 action 与 H5 公共接口）
- PC 端新增：`admin/src/services/shipment.js`、`admin/src/services/freight.js`
- PC 端新增：`admin/src/views/shipments/ShipmentList.vue`、`ShipmentDetail.vue`、`admin/src/views/freight/FreightList.vue`
- 小程序修改：`miniprogram/pages/shipping/*`、`miniprogram/pages/contract/detail/*`、`miniprogram/utils/status.js`
- 小程序修改：`miniprogram/pages/home/supplier/*`、`miniprogram/pages/settings/*`、新增 `miniprogram/pages/org/manage/*`
- H5 新增：`h5/shipment/index.html`、`styles.css`、`app.js`
- 发货详情补强：`shipment.detail` 已返回司机签名/装车照临时地址与 GPS 文本，PC / 小程序可直接展示司机交接凭证
- H5 收口：移除“签名截图”兜底输入，司机提货仅保留手写签名 + 装车照片
- 小程序新增：`miniprogram/components/supplier-module-nav/*`，供应商模块导航改为页面内显式入口，不再依赖微信静态 tabBar 配置
- 小程序补强：`miniprogram/app.js` 兼容旧权限键（如 `contract_view` / `shipping_create`），避免老账号误丢模块权限
- 阶段 4 收口补强：`freightDocument.confirmArrival` 改由后端统一推进关联运单到达；新增 `notification.list/read/readAll`，小程序与 PC 通知中心切真实通知
- 合同结构升级：`admin/src/components/contracts/ContractDocumentEditor.vue`、`admin/src/utils/contractWord.js`、`miniprogram/pages/contract/detail/*` 已统一改为正文双表展示
- 主数据调整：`admin/src/views/parts/PartTypeList.vue` 已支持配件维度扩展与全量编辑；`admin/src/layouts/AdminLayout.vue` 已调整“基础资料”菜单顺序
- 供应商信息增强：`admin/src/views/suppliers/SupplierDetail.vue` 已支持原材料维护，合同默认从供应商基础工商/财务信息映射乙方信息与收款账户
- 地址入口调整：`admin/src/views/addresses/AddressList.vue` 改为可按路由锁定类型，新增 `货代地址维护` 入口复用同一套 `addresses` 数据
- 地址中心继续收敛：后台已移除独立 `/addresses` 路由入口，正式维护路径仅保留“供应商详情 -> 地址管理”和“物流与发货 -> 货代地址维护”
- 后端辅助：`cloudfunctions/api/utils/contract-document.js`、`routes/contract.js`、`routes/order.js`、`routes/organization.js`、`routes/partType.js` 已补合同全文、供应商映射、配件全量保存支持
- 状态链路补强：`cloudfunctions/api/routes/contract.js` 在上传已签合同后，若存在有效交付计划，将自动生成 `delivery_batches`
- 批次回填补强：`cloudfunctions/api/routes/batch.js` 在读取已签/执行中合同的批次列表时，若发现历史合同缺失 `delivery_batches`，会按合同交付表自动补建一次，避免供应商生产链路断档
- 小程序正式化收口：`miniprogram/app.js`、`utils/role.js`、`pages/settings/*`、各首页已移除原型角色切换与 mock fallback
- 部署文件：`deploy-packages/api-cloudfunction.zip` 需随最新代码重新打包上传
- 合同展示第二轮收口：PC 合同详情已移除重复的“合同明细”表格；小程序合同详情不再额外展示重复的批次摘要，合同页只保留合同确认、合同原文与已签 PDF 查阅
- 合同数量显示修正：小程序合同列表、供应商首页、管理员首页、合同详情已优先读取 `product_items.total_qty`，避免旧 `contract.items` 缺失时出现总量为空或 0
- 甲方权限基础：`cloudfunctions/api/routes/adminUser.js`、`admin/src/views/system/AdminUserList.vue`、`admin/src/constants/adminPermissions.js` 已支持甲方成员模块授权
- 库存管理一期：`cloudfunctions/api/routes/inventory.js`、`admin/src/views/inventory/InventoryView.vue` 已支持组装厂库存录入；`miniprogram/pages/inventory/overview/*` 改为真实只读数据
- 甲方移动验货：`miniprogram/pages/quality/detail/*` 已支持现场提交验货结果，`pages/quality/list/*` / `pages/home/admin/*` 已补甲方入口
- 权限校验补强：`cloudfunctions/api/utils/access.js`、`routes/status.js`、`routes/inspection.js`、`miniprogram/app.js` 已修正模块权限与老账号兼容逻辑

### 联调结论（2026-04-06）

- 阶段 2 合同链路已通过用户实测：PC 端 Word 导出正常、已签 PDF 上传正常、小程序可查看合同记录
- 小程序手机号验证码登录已通过用户实测
- 阶段 3 生产/验货主链路已通过用户实测

### 收口结论（2026-04-11）

- 质检附件闭环已补齐：PC 端验货提交支持图片/视频附件，PC 与小程序验货详情均可查看实际附件
- 小程序合同确认第一版已完成：供应商可在线确认合同内容，管理员工作台与通知页会出现“待发起签约”提醒
- 小程序已签 PDF 可直接打开；未签 Word 暂未做云端文件预览，当前以系统合同详情为在线查阅页
- 订单生成页已补齐单份/批量“推送给供应商确认”，并可直接展示合同状态与供应商确认状态
- 通知与文件查看小修已完成：供应商首页“最新通知”支持直达待确认合同；已签 PDF 改为云函数获取临时地址后打开；PC 端合同管理可直接查看已签 PDF；订单生成页取消采购数量默认值
- 已继续加固合同文件打开链路：云函数临时地址改为显式 `fileID + maxAge`，PC 端改为 blob 方式打开 PDF，小程序按 `.pdf` 文件名保存后再 `openDocument`
- 小程序已签 PDF 打开链路已最终修复：兼容 `wx.downloadFile` 返回 `filePath`，避免下载成功后被误判为“下载失败”
- 小程序合同全文查看链路已打通：供应商收到 PC 端推送后，可先在线查看合同正文并确认；签署完成后继续查看归档 PDF
- 合同采购货物说明已按一期验收反馈收敛为正文双表，现阶段不做“附表/附件页”拆分
- 地址数据源未拆分：供应商地址与货代地址仍共用 `addresses` 集合，仅调整入口与维护位置；“组装厂绑定特定货代”仍待未来单独设计
- PRD 中“合同签署后自动生成待生产批次”的主链路已与代码实现对齐，避免“合同交付”和“生产验货”之间断层
- 司机 H5 第三轮收口已完成：升级 CloudBase Web SDK V2、兼容匿名登录、同一二维码可重复打开并支持现场连续完成 Step1/Step2
- 司机凭证查看已补齐：供应商/收货方小程序与甲方 PC 端可查看手写签名、装车照片、接单/提货 GPS
- 供应商小程序 IA 首轮重构已完成：首页改为模块工作台；合同、生产、发货模块按权限裁剪，不再用负责人/成员两套固定导航壳
- 生产与验货模块已从首页剥离：供应商进入“生产验货”页后可直接看到待标记已生产任务与验货状态
- 供应商导航第二轮收口已完成：合同交付 / 生产验货 / 发货物流 / 我的组织已改为页面内统一模块导航；负责人默认全量可见，成员按权限裁剪
- 供应商导航第三轮收口已完成：模块导航从页面顶部改为底部固定栏；统一为 首页 / 合同交付 / 生产验货 / 发货物流 / 我的，“我的组织”收回“我的”内页
- 当前无需新增数据库集合；本轮继续复用 `users / inventory / inventory_change_logs / inspection_records`

---

## 开发阶段总览

| 阶段 | 内容 | 状态 |
|:---:|------|:----:|
| 0 | 基础设施 + 认证（云函数/集合/JWT/三端登录） | 🟩 基本完成 |
| 1 | 主数据管理（产品/供应商5Tab全可用/地址/数据导入） | 🟩 已完成 |
| 2 | 合同 + 交付计划（下单生成/Word导出/签署归档） | 🟩 已完成并通过联调 |
| 3 | 生产 + 验货（状态机/标记已生产/验货结果） | 🟩 首批范围已完成并通过联调 |
| 3.5 | 库存引擎（inventory增减封装/change_log/供应商上报） | 🟨 收货入库所需最小能力已完成 |
| 4 | 发货 + 物流（发货单/数量异常分支/司机H5/收货/货代） | 🟨 本地代码已完成，待云端联调 |
| 5 | 组装厂全流程（组装/拆包/成品验货出库/质量异常） | ⬜ 未开始 |
| 6 | 库存管理UI + 盘点 | ⬜ 未开始 |
| 7 | 驾驶舱 + 报表 + 联调收尾 | ⬜ 未开始 |
