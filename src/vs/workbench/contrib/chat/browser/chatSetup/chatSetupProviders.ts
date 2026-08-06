/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { WorkbenchActionExecutedClassification, WorkbenchActionExecutedEvent } from '../../../../../base/common/actions.js';
import { raceTimeout, timeout } from '../../../../../base/common/async.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { toErrorMessage } from '../../../../../base/common/errorMessage.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { FileAccess } from '../../../../../base/common/network.js';
import { dirname } from '../../../../../base/common/path.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { Lazy } from '../../../../../base/common/lazy.js';
import { Disposable, DisposableStore, IDisposable, toDisposable } from '../../../../../base/common/lifecycle.js';
import { URI } from '../../../../../base/common/uri.js';
import { localize, localize2 } from '../../../../../nls.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IFileService, IFileStat } from '../../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import product from '../../../../../platform/product/common/product.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { IWorkspaceTrustManagementService } from '../../../../../platform/workspace/common/workspaceTrust.js';
import { IWorkbenchEnvironmentService } from '../../../../services/environment/common/environmentService.js';
import { nullExtensionDescription } from '../../../../services/extensions/common/extensions.js';
import { CountTokensCallback, ILanguageModelToolsService, IPreparedToolInvocation, IToolData, IToolImpl, IToolInvocation, IToolResult, ToolDataSource, ToolProgress } from '../../common/tools/languageModelToolsService.js';
import { IChatAgentHistoryEntry, IChatAgentImplementation, IChatAgentRequest, IChatAgentResult, IChatAgentService } from '../../common/participants/chatAgents.js';
import { ChatEntitlement, ChatEntitlementContext, IChatEntitlementService } from '../../../../services/chat/common/chatEntitlementService.js';
import { ChatModel, ChatRequestModel, IChatRequestModel, IChatRequestVariableData } from '../../common/model/chatModel.js';
import { ChatMode } from '../../common/chatModes.js';
import { ChatRequestAgentPart, ChatRequestToolPart } from '../../common/requestParser/chatParserTypes.js';
import { IChatFollowup, IChatProgress, IChatResponseProgressFileTreeData, IChatService } from '../../common/chatService/chatService.js';
import { IChatRequestToolEntry } from '../../common/attachments/chatVariableEntries.js';
import { ChatAgentLocation, ChatConfiguration, ChatModeKind } from '../../common/constants.js';
import { ILanguageModelsService } from '../../common/languageModels.js';
import { CHAT_OPEN_ACTION_ID, CHAT_SETUP_ACTION_ID } from '../actions/chatActions.js';
import { ChatViewId, IChatWidgetService } from '../chat.js';
import { IViewsService } from '../../../../services/views/common/viewsService.js';
import { ChatViewPane } from '../widgetHosts/viewPane/chatViewPane.js';
import { ILanguageFeaturesService } from '../../../../../editor/common/services/languageFeatures.js';
import { CodeAction, CodeActionList, Command, NewSymbolName, NewSymbolNameTriggerKind } from '../../../../../editor/common/languages.js';
import { ITextModel } from '../../../../../editor/common/model.js';
import { IRange, Range } from '../../../../../editor/common/core/range.js';
import { ISelection, Selection } from '../../../../../editor/common/core/selection.js';
import { ResourceMap } from '../../../../../base/common/map.js';
import { CodeActionKind } from '../../../../../editor/contrib/codeAction/common/types.js';
import { ACTION_START as INLINE_CHAT_START } from '../../../inlineChat/common/inlineChat.js';
import { IPosition } from '../../../../../editor/common/core/position.js';
import { IMarker, IMarkerService, MarkerSeverity } from '../../../../../platform/markers/common/markers.js';
import { ChatSetupController } from './chatSetupController.js';
import { ChatGlobalPerfMark, markChatGlobal } from '../../common/chatPerf.js';
import { ChatSetupAnonymous, ChatSetupStep, IChatSetupResult, maybeEnableAuthExtension, refreshTokens } from './chatSetup.js';
import { ChatSetup } from './chatSetupRunner.js';
import { chatViewsWelcomeRegistry } from '../viewsWelcome/chatViewsWelcome.js';
import { CommandsRegistry, ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IDefaultAccountService } from '../../../../../platform/defaultAccount/common/defaultAccount.js';
import { IHostService } from '../../../../services/host/browser/host.js';
import { IOutputService } from '../../../../services/output/common/output.js';
import { IExtensionsWorkbenchService } from '../../../extensions/common/extensions.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { ChatSubmitAction } from '../actions/chatExecuteActions.js';

const defaultChat = {
	extensionId: product.defaultChatAgent?.extensionId ?? '',
	chatExtensionId: product.defaultChatAgent?.chatExtensionId ?? '',
	provider: product.defaultChatAgent?.provider ?? { default: { id: '', name: '' }, enterprise: { id: '', name: '' }, apple: { id: '', name: '' }, google: { id: '', name: '' } },
	outputChannelId: product.defaultChatAgent?.chatExtensionOutputId ?? '',
	outputExtensionStateCommand: product.defaultChatAgent?.chatExtensionOutputExtensionStateCommand ?? '',
};

const ToolsAgentContextKey = ContextKeyExpr.and(
	ContextKeyExpr.equals(`config.${ChatConfiguration.AgentEnabled}`, true),
	ContextKeyExpr.not(`previewFeaturesDisabled`) // Set by extension
);

const TITANIUM_WORKFLOW_TRIGGER = 'v0-v3';
const TITANIUM_WORKFLOW_DIR = 'titanium-cup-storefront';
const TITANIUM_WORKFLOW_SOURCE_DIR = 'titanium-vibe-coding-v0-v3-guide';
const TITANIUM_WORKFLOW_SECTION_DELAY = 2800;
const TITANIUM_WORKFLOW_STREAM_FRAMES = 18;
const TITANIUM_WORKFLOW_PROGRESS_DELAY = 1600;
const TITANIUM_WORKFLOW_IGNORED_NAMES = new Set(['node_modules', '.next', 'tsconfig.tsbuildinfo']);

type TitaniumWorkflowStage = 'v0' | 'v1' | 'v2' | 'v3';
type TitaniumWorkflowPhase = 'planning' | 'ready' | 'running' | 'done';

interface ITitaniumWorkflowStageConfig {
	readonly stage: TitaniumWorkflowStage;
	readonly promptFile: string;
	readonly title: string;
	readonly planIntro: string;
	readonly checkMessage: string;
	readonly codingMessage: string;
	readonly doneMessage: string;
	readonly recommendedSelection: string;
	readonly options: readonly { readonly title: string; readonly body: string }[];
	readonly requirementDraft?: readonly string[];
	readonly streamedFiles: readonly { readonly relativePath: string; readonly label: string; readonly language: string; readonly message: string }[];
}

interface ITitaniumWorkflowState {
	stage: TitaniumWorkflowStage;
	phase: TitaniumWorkflowPhase;
	targetRoot: URI;
	lastUserMessage: string;
	planStep: number;
	selectedChoices: string[];
}

const TITANIUM_WORKFLOW_STAGE_ORDER: readonly TitaniumWorkflowStage[] = ['v0', 'v1', 'v2', 'v3'];

const TITANIUM_WORKFLOW_STAGES: Record<TitaniumWorkflowStage, ITitaniumWorkflowStageConfig> = {
	v0: {
		stage: 'v0',
		promptFile: 'V0_PROMPT.md',
		title: 'v0 技术选型与项目初始化',
		planIntro: '我会先帮你确定这个独立站的工程基础。考虑到后续可能加入产品图片、视频、真实 OBJ/MTL 3D 模型和客服功能，建议优先选择可扩展的前端技术栈。',
		checkMessage: '正在确认 Node.js 前端工程结构、基础配置和后续 3D 能力预留。',
		codingMessage: '正在创建 Next.js / React / TypeScript / Tailwind 工程基础。',
		doneMessage: 'v0 工程基础已经完成：项目可以继续承接图片、视频、真实 3D 模型和客服能力。',
		recommendedSelection: '技术栈组合 A，样式与 3D 预留 A，基础文件范围 C',
		options: [
			{ title: '技术栈组合', body: 'A. Next.js + React + TypeScript + npm：适合独立站、品牌官网、产品展示和后续持续迭代\nB. Vite + React + TypeScript + npm：更轻量，适合纯前端展示页，但独立站工程能力弱一些\nC. Next.js + React + JavaScript + npm：保留 Next.js 能力，但长期维护和复杂组件类型约束较弱' },
			{ title: '样式与 3D 预留', body: 'A. Tailwind CSS + Babylon.js 预装：方便快速做响应式品牌页，并为 OBJ/MTL/PNG 贴图 3D 查看器提前准备\nB. Tailwind CSS + 暂不安装 3D 依赖：先保持工程轻量，等 v3 再接入 3D\nC. CSS Modules + Three.js 预留：结构清晰，但后续 OBJ/MTL 材质处理需要更多手动代码' },
			{ title: '基础文件范围', body: 'A. 只生成最小可运行项目：package.json、Next 配置、src/app 基础文件\nB. 最小项目 + public/products 资源目录：为后续真实产品图片和视频预留位置\nC. 最小项目 + public/products + README：同时生成基础项目说明，方便后续 v1-v3 继续迭代' }
		],
		requirementDraft: [
			'项目定位：面向海外用户的纯钛杯英文独立站工程基础。',
			'当前阶段：只完成 v0 技术选型与项目初始化，不做完整商品页。',
			'推荐技术栈：Node.js、Next.js、React、TypeScript、Tailwind CSS、Babylon.js、Babylon.js Loaders、npm。',
			'目录目标：建立可持续迭代的 App Router 项目结构，并预留 public/products 资源目录。',
			'基础文件：package.json、package-lock.json、next.config.ts、tsconfig.json、postcss.config.mjs、eslint.config.mjs、next-env.d.ts、src/app/page.tsx、src/app/layout.tsx、src/app/globals.css、public/products/、README.md。',
			'明确不做：不制作完整商品首页，不接入真实产品图片，不处理视频，不加载 3D 模型，不添加智能客服，不做复杂品牌视觉、购买按钮、产品矩阵和场景模块。',
			'完成标准：可以安装依赖并通过 npm run dev 启动，首页只保留最小占位页面，工程结构能支撑后续图片、视频、3D 和客服功能。'
		],
		streamedFiles: [
			{ relativePath: 'titanium-cup-showcase/package.json', label: '项目依赖', language: 'json', message: '正在写入项目依赖和开发脚本。' },
			{ relativePath: 'titanium-cup-showcase/src/app/page.tsx', label: '首页占位', language: 'typescriptreact', message: '正在写入最小可运行首页。' },
			{ relativePath: 'titanium-cup-showcase/src/app/globals.css', label: '全局样式', language: 'css', message: '正在整理基础样式入口。' },
			{ relativePath: 'titanium-cup-showcase/README.md', label: '项目说明', language: 'markdown', message: '正在补充 v0 工程说明。' }
		]
	},
	v1: {
		stage: 'v1',
		promptFile: 'V0_TO_V1_PROMPT.md',
		title: 'v1 基础商品独立站',
		planIntro: '我会基于已有工程继续做第一个可用英文商品页。编码前先检查项目结构和真实产品图片，页面只做基础转化闭环。',
		checkMessage: '正在检查 v0 工程、产品图片和基础页面所需资源。',
		codingMessage: '正在编写基础商品独立站页面。',
		doneMessage: 'v1 基础商品独立站已经完成：页面包含 Hero、主推产品、价格、规格、购买按钮、推荐产品和页脚。',
		recommendedSelection: '页面结构 A，视觉风格 A，主推产品布局 A，推荐产品数量 B，商品转化重点 B',
		options: [
			{ title: '页面结构', body: 'A. 标准单页落地页：Hero + Featured Product + Recommended Products + Footer\nB. 商品详情式首页：主商品信息更重，推荐产品较少\nC. 产品目录式首页：推荐产品较多，主商品较弱' },
			{ title: '视觉风格', body: 'A. 简洁白底电商风\nB. 浅灰卡片风\nC. 基础深色风' },
			{ title: '主推产品布局', body: 'A. 左图右文\nB. 上图下文\nC. 大图居中 + 下方参数卡片' },
			{ title: '推荐产品数量', body: 'A. 4 个\nB. 8 个\nC. 根据素材数量自动决定' },
			{ title: '商品转化重点', body: 'A. 强调价格和购买按钮\nB. 强调材质、健康和轻量\nC. 强调礼品属性和文化纹样' }
		],
		requirementDraft: [
			'项目定位：基于 v0 工程基础生成第一个可用的英文纯钛杯商品独立站页面。',
			'素材策略：先检查真实产品图片素材，只使用存在的图片路径，不虚构素材。',
			'主推产品：Han Dynasty Heavenly Horse Pattern Pure Titanium Thermos。',
			'页面结构：导航、Hero、主推产品区、价格、规格、购买按钮、推荐产品区和页脚。',
			'英文卖点：99.95% Pure Titanium、Naturally Antibacterial、Lightweight and Durable、Gift-ready Design、No Metallic Taste、Acid-Base Resistant。',
			'明确不做：不接入 3D，不接入视频，不添加智能客服，不做复杂动画，不重绘或生成产品图。',
			'完成标准：页面可以启动，英文文案完整，商品卖点、价格、规格和购买按钮清晰，并生成本地预览启动脚本。'
		],
		streamedFiles: [
			{ relativePath: 'titanium-cup-showcase/src/app/page.tsx', label: '商品首页', language: 'typescriptreact', message: '正在写入基础商品首页结构。' },
			{ relativePath: 'titanium-cup-showcase/src/app/globals.css', label: '页面样式', language: 'css', message: '正在整理基础电商页面样式。' },
			{ relativePath: 'run-v1.cmd', label: '启动脚本', language: 'bat', message: '正在补充本地预览启动脚本。' },
			{ relativePath: 'README.md', label: '阶段说明', language: 'markdown', message: '正在记录 v1 页面说明。' }
		]
	},
	v2: {
		stage: 'v2',
		promptFile: 'V1_TO_V2_PROMPT.md',
		title: 'v2 高端品牌媒体页',
		planIntro: '我会在现有基础商品页上继续增强视觉、媒体展示和购买说服力。当前阶段仍不接入 3D 和客服。',
		checkMessage: '正在检查页面结构、真实图片、视频素材和可用于场景展示的资源。',
		codingMessage: '正在升级高端品牌媒体页和图片/视频展示体验。',
		doneMessage: 'v2 高端品牌媒体页已经完成：黑金视觉、产品图库、视频、场景展示、材质卖点和转化信息都已补齐。',
		recommendedSelection: '视觉方向 A，首屏结构 A，媒体展示方式 B，场景展示重点 D，页面复杂度 A',
		options: [
			{ title: '视觉方向', body: 'A. 黑金高端钛金属风：深色背景、金色点缀、适合礼品和高端材质表达\nB. 明亮高级电商风：白底为主，信息清楚，转化优先\nC. 东方文化礼品风：强调 Han Dynasty Heavenly Horse、Silk Road、heritage pattern' },
			{ title: '首屏结构', body: 'A. 左侧英文卖点 + 右侧大产品图 + 价格和购买按钮\nB. 大图海报式首屏，文字叠加在背景上\nC. 主图居中，核心卖点和按钮分布在下方' },
			{ title: '媒体展示方式', body: 'A. 主推产品多图缩略图切换\nB. 图片 + 视频混合缩略图切换\nC. 图片图库 + 单独视频展示模块' },
			{ title: '场景展示重点', body: 'A. Daily Carry：日常携带、轻量、耐用\nB. Tea & Coffee：茶饮、咖啡、clean taste\nC. Gift-ready：礼盒、文化纹样、送礼属性\nD. 综合展示：日常、茶饮、礼品、细节都包含' },
			{ title: '页面复杂度', body: 'A. 中等复杂度：主要集中在 page.tsx 和 globals.css，少量交互\nB. 组件化版本：拆分 ProductGallery、HeroSection、FeatureGrid 等组件\nC. 极简增强：只在 v1 基础上做视觉和少量内容优化' }
		],
		requirementDraft: [
			'项目定位：在 v1 基础商品页之上升级为更完整的高端品牌媒体页。',
			'检查范围：先检查现有页面结构、真实图片和视频素材，再决定图库与场景展示方式。',
			'视觉目标：更有纯钛金属质感、黑金调性、礼品属性和文化表达。',
			'功能目标：强化首屏、价格、购买按钮、核心卖点、图片/视频图库、场景展示、材质卖点和信任信息。',
			'英文文案方向：Pure Titanium, Pure Taste、99.95% Pure Titanium、Clean Taste, No Metallic Flavor、Gift-ready Heritage Design。',
			'明确不做：不接入 3D 模型，不添加智能客服，不做 3D loading，不编造素材路径，不重绘产品图。',
			'完成标准：页面明显比 v1 更有品牌质感，真实图片/视频可展示，UI 文案为英文，并生成本轮增量改造记录和启动脚本。'
		],
		streamedFiles: [
			{ relativePath: 'titanium-cup-showcase/src/app/page.tsx', label: '品牌首页', language: 'typescriptreact', message: '正在重构高端品牌首页。' },
			{ relativePath: 'titanium-cup-showcase/src/app/globals.css', label: '视觉系统', language: 'css', message: '正在整理黑金钛金属视觉层级。' },
			{ relativePath: 'V1_TO_V2_CHANGES.md', label: '增量记录', language: 'markdown', message: '正在记录本轮增量改造。' },
			{ relativePath: 'run-v2.cmd', label: '启动脚本', language: 'bat', message: '正在补充本地预览启动脚本。' }
		]
	},
	v3: {
		stage: 'v3',
		promptFile: 'V2_TO_V3_PROMPT.md',
		title: 'v3 真实 3D 与英文客服最终版',
		planIntro: '我会在高端品牌媒体页基础上接入真实 OBJ/MTL/贴图模型、入场 loading、3D 交互控制和右下角英文客服。',
		checkMessage: '正在检查真实 OBJ、MTL、PNG 贴图和最终交互所需组件边界。',
		codingMessage: '正在接入真实 3D 模型、页面 loading 和英文客服。',
		doneMessage: 'v3 最终交互版已经完成：真实 3D、加载体验、交互控制和英文客服已接入。',
		recommendedSelection: '3D 加载方式 A，模型资产策略 A，交互控制 C，客服形式 C',
		options: [
			{ title: '3D 加载方式', body: 'A. 页面进入后立即加载 3D，加载完成后隐藏全屏 loading\nB. 用户滚动到 3D 区域再加载\nC. 用户点击按钮后再加载' },
			{ title: '模型资产策略', body: 'A. 严格使用原始 OBJ/MTL/贴图，不压缩、不转格式\nB. 复制原始 OBJ/MTL/贴图到 v3 public 目录，但不转换格式\nC. 使用外部公共 assets 路径引用模型' },
			{ title: '交互控制', body: 'A. 拖动旋转 + 滚轮缩放\nB. 拖动旋转 + 滚轮缩放 + 自动旋转\nC. 拖动旋转 + 滚轮缩放 + 自动旋转 + 暂停按钮 + 重置视角' },
			{ title: '客服形式', body: 'A. FAQ 静态列表\nB. 右下角悬浮客服按钮\nC. 聊天弹窗 + 常见问题快捷按钮' }
		],
		requirementDraft: [
			'项目定位：在 v2 高端品牌媒体页基础上加入真实 3D 与英文客服，形成最终交互版。',
			'检查范围：先检查 v2 页面结构和真实 3D 模型目录，列出 OBJ、MTL 和 PNG 贴图文件名。',
			'3D 目标：使用 Babylon.js 加载真实 OBJ/MTL/贴图，支持拖动旋转、滚轮缩放、自动旋转、暂停和重置视角。',
			'加载体验：页面进入时显示英文 loading，等待 3D 模型加载完成后再呈现完整页面；失败时显示英文错误提示。',
			'客服目标：右下角英文客服组件，回答材质、容量、颜色、物流、售后、保养和礼品定制问题。',
			'明确不做：不自己建模，不使用占位模型，不转 GLB，不压缩模型，不替换贴图，不移除 v2 的图片/视频和购买转化结构。',
			'完成标准：真实 3D 可交互，3D 区域滚轮不带动页面滚动，客服为英文 UI，并生成本地启动脚本。'
		],
		streamedFiles: [
			{ relativePath: 'titanium-cup-showcase/src/components/Model3DViewer.tsx', label: '3D 查看器', language: 'typescriptreact', message: '正在写入 Babylon.js 3D 查看器。' },
			{ relativePath: 'titanium-cup-showcase/src/components/PageModelLoadingOverlay.tsx', label: '加载体验', language: 'typescriptreact', message: '正在写入 3D 加载等待层。' },
			{ relativePath: 'titanium-cup-showcase/src/components/SmartCS.tsx', label: '英文客服', language: 'typescriptreact', message: '正在写入右下角英文客服。' },
			{ relativePath: 'titanium-cup-showcase/src/app/page.tsx', label: '页面接入', language: 'typescriptreact', message: '正在把 3D 和客服接入首页。' },
			{ relativePath: 'titanium-cup-showcase/next.config.ts', label: '开发配置', language: 'typescript', message: '正在补充本地开发兼容配置。' },
			{ relativePath: 'run-v3.cmd', label: '启动脚本', language: 'bat', message: '正在补充本地预览启动脚本。' }
		]
	}
};


export class SetupAgent extends Disposable implements IChatAgentImplementation {

	private readonly titaniumWorkflowStates = new ResourceMap<ITitaniumWorkflowState>();

	static registerDefaultAgents(instantiationService: IInstantiationService, location: ChatAgentLocation, mode: ChatModeKind, context: ChatEntitlementContext, controller: Lazy<ChatSetupController>): { agent: SetupAgent; disposable: IDisposable } {
		return instantiationService.invokeFunction(accessor => {
			const chatAgentService = accessor.get(IChatAgentService);

			let description;
			if (mode === ChatModeKind.Ask) {
				description = ChatMode.Ask.description.get();
			} else if (mode === ChatModeKind.Edit) {
				description = ChatMode.Edit.description.get();
			} else {
				description = ChatMode.Agent.description.get();
			}

			let id: string;
			switch (location) {
				case ChatAgentLocation.Chat:
					if (mode === ChatModeKind.Ask) {
						id = 'setup.chat';
					} else if (mode === ChatModeKind.Edit) {
						id = 'setup.edits';
					} else {
						id = 'setup.agent';
					}
					break;
				case ChatAgentLocation.Terminal:
					id = 'setup.terminal';
					break;
				case ChatAgentLocation.EditorInline:
					id = 'setup.editor';
					break;
				case ChatAgentLocation.Notebook:
					id = 'setup.notebook';
					break;
			}

			return SetupAgent.doRegisterAgent(instantiationService, chatAgentService, id, `${defaultChat.provider.default.name} Copilot` /* Do NOT change, this hides the username altogether in Chat */, true, description, location, mode, context, controller);
		});
	}

	static registerBuiltInAgents(instantiationService: IInstantiationService, context: ChatEntitlementContext, controller: Lazy<ChatSetupController>): IDisposable {
		return instantiationService.invokeFunction(accessor => {
			const chatAgentService = accessor.get(IChatAgentService);

			const disposables = new DisposableStore();

			// Register VSCode agent
			const { disposable: vscodeDisposable } = SetupAgent.doRegisterAgent(instantiationService, chatAgentService, 'setup.vscode', 'vscode', false, localize2('vscodeAgentDescription', "Ask questions about VS Code").value, ChatAgentLocation.Chat, ChatModeKind.Agent, context, controller);
			disposables.add(vscodeDisposable);

			// Register workspace agent
			const { disposable: workspaceDisposable } = SetupAgent.doRegisterAgent(instantiationService, chatAgentService, 'setup.workspace', 'workspace', false, localize2('workspaceAgentDescription', "Ask about your workspace").value, ChatAgentLocation.Chat, ChatModeKind.Agent, context, controller);
			disposables.add(workspaceDisposable);

			// Register terminal agent
			const { disposable: terminalDisposable } = SetupAgent.doRegisterAgent(instantiationService, chatAgentService, 'setup.terminal.agent', 'terminal', false, localize2('terminalAgentDescription', "Ask how to do something in the terminal").value, ChatAgentLocation.Chat, ChatModeKind.Agent, context, controller);
			disposables.add(terminalDisposable);

			// Register tools
			disposables.add(SetupTool.registerTool(instantiationService, {
				id: 'setup_tools_createNewWorkspace',
				source: ToolDataSource.Internal,
				icon: Codicon.newFolder,
				displayName: localize('setupToolDisplayName', "New Workspace"),
				modelDescription: 'Scaffold a new workspace in VS Code',
				userDescription: localize('setupToolsDescription', "Scaffold a new workspace in VS Code"),
				canBeReferencedInPrompt: true,
				toolReferenceName: 'new',
				when: ContextKeyExpr.true(),
			}));

			return disposables;
		});
	}

	private static doRegisterAgent(instantiationService: IInstantiationService, chatAgentService: IChatAgentService, id: string, name: string, isDefault: boolean, description: string, location: ChatAgentLocation, mode: ChatModeKind, context: ChatEntitlementContext, controller: Lazy<ChatSetupController>): { agent: SetupAgent; disposable: IDisposable } {
		const disposables = new DisposableStore();
		disposables.add(chatAgentService.registerAgent(id, {
			id,
			name,
			isDefault,
			isCore: true,
			modes: [mode],
			when: mode === ChatModeKind.Agent ? ToolsAgentContextKey?.serialize() : undefined,
			slashCommands: [],
			disambiguation: [],
			locations: [location],
			metadata: {},
			description,
			extensionId: nullExtensionDescription.identifier,
			extensionVersion: undefined,
			extensionDisplayName: nullExtensionDescription.name,
			extensionPublisherId: nullExtensionDescription.publisher
		}));

		const agent = disposables.add(instantiationService.createInstance(SetupAgent, context, controller, location));
		disposables.add(chatAgentService.registerAgentImplementation(id, agent));
		if (mode === ChatModeKind.Agent) {
			chatAgentService.updateAgent(id, { themeIcon: Codicon.tools });
		}

		return { agent, disposable: disposables };
	}

	private static readonly DEMO_READY_MESSAGE = new MarkdownString('当前是 AI 编程教学演示模式，不需要登录 GitHub Copilot。请输入 `v0-v3` 或 `v0` 开始钛杯独立站流程。');
	private static readonly TRUST_NEEDED_MESSAGE = new MarkdownString(localize('trustNeeded', "You need to trust this workspace to use Chat."));
	private static readonly CHAT_RETRY_COMMAND_ID = 'workbench.action.chat.retrySetup';
	private static readonly CHAT_SHOW_OUTPUT_COMMAND_ID = 'workbench.action.chat.showOutput';

	private readonly _onUnresolvableError = this._register(new Emitter<void>());
	readonly onUnresolvableError = this._onUnresolvableError.event;

	private readonly pendingForwardedRequests = new ResourceMap<Promise<void>>();

	constructor(
		private readonly context: ChatEntitlementContext,
		private readonly controller: Lazy<ChatSetupController>,
		private readonly location: ChatAgentLocation,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@ILogService private readonly logService: ILogService,
		@ITelemetryService private readonly telemetryService: ITelemetryService,
		@IWorkbenchEnvironmentService private readonly environmentService: IWorkbenchEnvironmentService,
		@IWorkspaceTrustManagementService private readonly workspaceTrustManagementService: IWorkspaceTrustManagementService,
		@IChatEntitlementService private readonly chatEntitlementService: IChatEntitlementService,
		@IViewsService private readonly viewsService: IViewsService,
		@IContextKeyService private readonly contextKeyService: IContextKeyService,
		@IOutputService private readonly outputService: IOutputService,
		@IExtensionsWorkbenchService private readonly extensionsWorkbenchService: IExtensionsWorkbenchService,
		@ICommandService private readonly commandService: ICommandService,
		@IFileService private readonly fileService: IFileService,
		@IWorkspaceContextService private readonly workspaceContextService: IWorkspaceContextService,
		@IEditorService private readonly editorService: IEditorService,
	) {
		super();

		this.registerCommands();
	}

	private registerCommands(): void {

		// Retry chat command
		this._register(CommandsRegistry.registerCommand(SetupAgent.CHAT_RETRY_COMMAND_ID, async (accessor, sessionResource: URI) => {
			const hostService = accessor.get(IHostService);
			const chatWidgetService = accessor.get(IChatWidgetService);

			const widget = chatWidgetService.getWidgetBySessionResource(sessionResource);
			await widget?.clear();

			hostService.reload();
		}));

		// Show output command: execute extension state command if available, then show output channel
		this._register(CommandsRegistry.registerCommand(SetupAgent.CHAT_SHOW_OUTPUT_COMMAND_ID, async (accessor) => {
			const commandService = accessor.get(ICommandService);

			if (defaultChat.outputExtensionStateCommand) {
				// Command invocation may fail or is blocked by the extension activating
				// so we just don't wait and timeout after a certain time, logging the error if it fails or times out.
				raceTimeout(
					commandService.executeCommand(defaultChat.outputExtensionStateCommand),
					5000,
					() => this.logService.info('[chat setup] Timed out executing extension state command')
				).then(undefined, error => {
					this.logService.info('[chat setup] Failed to execute extension state command', error);
				});
			}

			if (defaultChat.outputChannelId) {
				await commandService.executeCommand(`workbench.action.output.show.${defaultChat.outputChannelId}`);
			}
		}));
	}

	async invoke(request: IChatAgentRequest, progress: (parts: IChatProgress[]) => void): Promise<IChatAgentResult> {
		return this.instantiationService.invokeFunction(async accessor /* using accessor for lazy loading */ => {
			const chatService = accessor.get(IChatService);
			const languageModelsService = accessor.get(ILanguageModelsService);
			const chatWidgetService = accessor.get(IChatWidgetService);
			const chatAgentService = accessor.get(IChatAgentService);
			const languageModelToolsService = accessor.get(ILanguageModelToolsService);
			const defaultAccountService = accessor.get(IDefaultAccountService);

			return this.doInvoke(request, part => progress([part]), chatService, languageModelsService, chatWidgetService, chatAgentService, languageModelToolsService, defaultAccountService);
		});
	}

	private async doInvoke(request: IChatAgentRequest, progress: (part: IChatProgress) => void, chatService: IChatService, languageModelsService: ILanguageModelsService, chatWidgetService: IChatWidgetService, chatAgentService: IChatAgentService, languageModelToolsService: ILanguageModelToolsService, defaultAccountService: IDefaultAccountService): Promise<IChatAgentResult> {
		if (await this.handleTitaniumWorkflowRequest(request, progress)) {
			return {};
		}

		if (
			!this.context.state.completed ||									// Setup not completed
			this.context.state.disabled ||										// Extension disabled: run setup to enable
			this.context.state.untrusted ||										// Workspace untrusted: run setup to ask for trust
			this.context.state.entitlement === ChatEntitlement.Available ||		// Entitlement available: run setup to sign up
			(
				this.context.state.entitlement === ChatEntitlement.Unknown &&	// Entitlement unknown: run setup to sign in / sign up
				!this.chatEntitlementService.anonymous							// unless anonymous access is enabled
			)
		) {
			return this.doInvokeWithSetup(request, progress, chatService, languageModelsService, chatWidgetService, chatAgentService, languageModelToolsService, defaultAccountService);
		}

		return this.doInvokeWithoutSetup(request, progress, chatService, languageModelsService, chatWidgetService, chatAgentService, languageModelToolsService);
	}

	private async doInvokeWithoutSetup(request: IChatAgentRequest, progress: (part: IChatProgress) => void, chatService: IChatService, languageModelsService: ILanguageModelsService, chatWidgetService: IChatWidgetService, chatAgentService: IChatAgentService, languageModelToolsService: ILanguageModelToolsService): Promise<IChatAgentResult> {
		const requestModel = chatWidgetService.getWidgetBySessionResource(request.sessionResource)?.viewModel?.model.getRequests().at(-1);
		if (!requestModel) {
			this.logService.error('[chat setup] Request model not found, cannot redispatch request.');
			return {}; // this should not happen
		}

		progress({
			kind: 'progressMessage',
			content: new MarkdownString(localize('waitingChat', "Getting chat ready")),
			shimmer: true,
		});

		await this.forwardRequestToChat(requestModel, progress, chatService, languageModelsService, chatAgentService, chatWidgetService, languageModelToolsService);

		return {};
	}

	private async forwardRequestToChat(requestModel: IChatRequestModel, progress: (part: IChatProgress) => void, chatService: IChatService, languageModelsService: ILanguageModelsService, chatAgentService: IChatAgentService, chatWidgetService: IChatWidgetService, languageModelToolsService: ILanguageModelToolsService): Promise<void> {
		try {
			await this.doForwardRequestToChat(requestModel, progress, chatService, languageModelsService, chatAgentService, chatWidgetService, languageModelToolsService);
		} catch (error) {
			this.logService.error('[chat setup] Failed to forward request to chat', error);

			progress({
				kind: 'warning',
				content: new MarkdownString(localize('copilotUnavailableWarning', "Failed to get a response. Please try again."))
			});
		}
	}

	private async doForwardRequestToChat(requestModel: IChatRequestModel, progress: (part: IChatProgress) => void, chatService: IChatService, languageModelsService: ILanguageModelsService, chatAgentService: IChatAgentService, chatWidgetService: IChatWidgetService, languageModelToolsService: ILanguageModelToolsService): Promise<void> {
		if (this.pendingForwardedRequests.has(requestModel.session.sessionResource)) {
			throw new Error('Request already in progress');
		}

		const forwardRequest = this.doForwardRequestToChatWhenReady(requestModel, progress, chatService, languageModelsService, chatAgentService, chatWidgetService, languageModelToolsService);
		this.pendingForwardedRequests.set(requestModel.session.sessionResource, forwardRequest);

		try {
			await forwardRequest;
		} finally {
			this.pendingForwardedRequests.delete(requestModel.session.sessionResource);
		}
	}

	private async doForwardRequestToChatWhenReady(requestModel: IChatRequestModel, progress: (part: IChatProgress) => void, chatService: IChatService, languageModelsService: ILanguageModelsService, chatAgentService: IChatAgentService, chatWidgetService: IChatWidgetService, languageModelToolsService: ILanguageModelToolsService): Promise<void> {

		// Ensure auth extension is enabled before waiting for chat readiness.
		// This must run before the readiness event listeners are set up because
		// updateRunningExtensions restarts all extension hosts.
		const authExtensionReEnabled = await maybeEnableAuthExtension(this.extensionsWorkbenchService, this.logService);
		if (authExtensionReEnabled) {
			refreshTokens(this.commandService);
		}

		const widget = chatWidgetService.getWidgetBySessionResource(requestModel.session.sessionResource);
		const modeInfo = widget?.input.currentModeInfo;

		// We need a signal to know when we can resend the request to
		// Chat. Waiting for the registration of the agent is not
		// enough, we also need a language/tools model to be available.

		let agentActivated = false;
		let agentReady = false;
		let languageModelReady = false;
		let toolsModelReady = false;

		markChatGlobal(ChatGlobalPerfMark.WillWaitForActivation);

		const whenAgentActivated = this.whenAgentActivated(chatService).then(() => agentActivated = true);
		const whenAgentReady = this.whenAgentReady(chatAgentService, modeInfo?.kind)?.then(() => agentReady = true);
		if (!whenAgentReady) {
			agentReady = true;
		}
		const whenLanguageModelReady = this.whenLanguageModelReady(languageModelsService, requestModel.modelId)?.then(() => languageModelReady = true);
		if (!whenLanguageModelReady) {
			languageModelReady = true;
		}
		const whenToolsModelReady = this.whenToolsModelReady(languageModelToolsService, requestModel)?.then(() => toolsModelReady = true);
		if (!whenToolsModelReady) {
			toolsModelReady = true;
		}

		if (whenLanguageModelReady instanceof Promise || whenAgentReady instanceof Promise || whenToolsModelReady instanceof Promise) {
			const timeoutHandle = setTimeout(() => {
				progress({
					kind: 'progressMessage',
					content: new MarkdownString(localize('waitingChat2', "Chat is almost ready")),
					shimmer: true,
				});
			}, 10000);

			const disposables = new DisposableStore();
			disposables.add(toDisposable(() => clearTimeout(timeoutHandle)));
			try {
				const allReady = Promise.allSettled([
					whenAgentActivated,
					whenAgentReady,
					whenLanguageModelReady,
					whenToolsModelReady
				]);
				const ready = await Promise.race([
					timeout(this.environmentService.remoteAuthority ? 60000 /* increase for remote scenarios */ : 20000).then(() => 'timedout'),
					this.whenPanelAgentHasGuidance(disposables).then(() => 'panelGuidance'),
					allReady
				]);

				if (ready === 'panelGuidance') {
					const warningMessage = localize('chatTookLongWarningExtension', "Please try again.");

					progress({
						kind: 'markdownContent',
						content: new MarkdownString(warningMessage)
					});

					// This means Chat is unhealthy and we cannot retry the
					// request. Signal this to the outside via an event.
					this._onUnresolvableError.fire();
					return;
				}

				if (ready === 'timedout') {
					let warningMessage: string;
					if (this.chatEntitlementService.anonymous) {
						warningMessage = localize('chatTookLongWarningAnonymous', "Chat took too long to get ready. Please ensure that the extension `{0}` is installed and enabled. Click restart to try again if this issue persists.", defaultChat.chatExtensionId);
					} else {
						warningMessage = localize('chatTookLongWarning', "Chat took too long to get ready. Please ensure you are signed in to {0} and that the extension `{1}` is installed and enabled. Click restart to try again if this issue persists.", defaultChat.provider.default.name, defaultChat.chatExtensionId);
					}

					const diagnosticInfo = this.computeDiagnosticInfo(agentActivated, agentReady, languageModelReady, toolsModelReady, requestModel, languageModelsService, chatAgentService, modeInfo);

					this.logService.warn(`[chat setup] ${warningMessage}`, diagnosticInfo);

					type ChatSetupTimeoutClassification = {
						owner: 'chrmarti';
						comment: 'Provides insight into chat setup timeouts.';
						agentActivated: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; comment: 'Whether the agent was activated.' };
						agentReady: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; comment: 'Whether the agent was ready.' };
						agentHasDefault: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; comment: 'Whether a default agent exists for the location and mode.' };
						agentDefaultIsCore: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; comment: 'Whether the default agent is a core agent.' };
						agentHasContributedDefault: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; comment: 'Whether a contributed default agent exists for the location.' };
						agentContributedDefaultIsCore: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; comment: 'Whether the contributed default agent is a core agent.' };
						agentActivatedCount: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; isMeasurement: true; comment: 'Number of activated agents at timeout.' };
						agentLocation: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; comment: 'The chat agent location.' };
						agentModeKind: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; comment: 'The chat mode kind.' };
						languageModelReady: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; comment: 'Whether the language model was ready.' };
						languageModelCount: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; isMeasurement: true; comment: 'Number of registered language models at timeout.' };
						languageModelDefaultCount: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; isMeasurement: true; comment: 'Number of language models with isDefaultForLocation[Chat] set.' };
						languageModelHasRequestedModel: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; comment: 'Whether a specific model ID was requested.' };
						toolsModelReady: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; comment: 'Whether the tools model was ready.' };
						isRemote: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; comment: 'Whether this is a remote scenario.' };
						isAnonymous: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; comment: 'Whether anonymous access is enabled.' };
						matchingWelcomeViewWhen: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; comment: 'The when clause of the matching extension welcome view, if any.' };
					};
					type ChatSetupTimeoutEvent = {
						agentActivated: boolean;
						agentReady: boolean;
						agentHasDefault: boolean;
						agentDefaultIsCore: boolean;
						agentHasContributedDefault: boolean;
						agentContributedDefaultIsCore: boolean;
						agentActivatedCount: number;
						agentLocation: string;
						agentModeKind: string;
						languageModelReady: boolean;
						languageModelCount: number;
						languageModelDefaultCount: number;
						languageModelHasRequestedModel: boolean;
						toolsModelReady: boolean;
						isRemote: boolean;
						isAnonymous: boolean;
						matchingWelcomeViewWhen: string;
					};

					this.telemetryService.publicLog2<ChatSetupTimeoutEvent, ChatSetupTimeoutClassification>('chatSetup.timeout', diagnosticInfo);

					progress({
						kind: 'warning',
						content: new MarkdownString(warningMessage)
					});

					if (defaultChat.outputChannelId && this.outputService.getChannelDescriptor(defaultChat.outputChannelId)) {
						progress({
							kind: 'command',
							command: {
								id: SetupAgent.CHAT_SHOW_OUTPUT_COMMAND_ID,
								title: localize('showCopilotChatDetails', "Show Details")
							}
						});
					} else {
						this.logService.warn(defaultChat.outputChannelId
							? `[chat setup] No output channel found for id '${defaultChat.outputChannelId}' to show details about chat setup timeout. Please ensure the ${defaultChat.chatExtensionId} extension is activated.`
							: '[chat setup] No output channel provided via product.json to show details about chat setup timeout.');
						progress({
							kind: 'command',
							command: {
								id: SetupAgent.CHAT_RETRY_COMMAND_ID,
								title: localize('retryChat', "Restart"),
								arguments: [requestModel.session.sessionResource]
							}
						});
					}

					// Wait for all readiness signals and log/send
					// telemetry about recovery after the timeout.
					await allReady;

					const recoveryDiagnosticInfo = this.computeDiagnosticInfo(agentActivated, agentReady, languageModelReady, toolsModelReady, requestModel, languageModelsService, chatAgentService, modeInfo);

					this.logService.info('[chat setup] Chat setup timeout recovered', recoveryDiagnosticInfo);

					type ChatSetupTimeoutRecoveryClassification = {
						owner: 'chrmarti';
						comment: 'Provides insight into chat setup timeout recovery.';
						agentActivated: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; comment: 'Whether the agent was activated.' };
						agentReady: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; comment: 'Whether the agent was ready.' };
						agentHasDefault: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; comment: 'Whether a default agent exists for the location and mode.' };
						agentDefaultIsCore: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; comment: 'Whether the default agent is a core agent.' };
						agentHasContributedDefault: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; comment: 'Whether a contributed default agent exists for the location.' };
						agentContributedDefaultIsCore: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; comment: 'Whether the contributed default agent is a core agent.' };
						agentActivatedCount: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; isMeasurement: true; comment: 'Number of activated agents at recovery time.' };
						agentLocation: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; comment: 'The chat agent location.' };
						agentModeKind: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; comment: 'The chat mode kind.' };
						languageModelReady: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; comment: 'Whether the language model was ready.' };
						languageModelCount: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; isMeasurement: true; comment: 'Number of registered language models at recovery time.' };
						languageModelDefaultCount: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; isMeasurement: true; comment: 'Number of language models with isDefaultForLocation[Chat] set at recovery time.' };
						languageModelHasRequestedModel: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; comment: 'Whether a specific model ID was requested.' };
						toolsModelReady: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; comment: 'Whether the tools model was ready.' };
						isRemote: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; comment: 'Whether this is a remote scenario.' };
						isAnonymous: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; comment: 'Whether anonymous access is enabled.' };
						matchingWelcomeViewWhen: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; comment: 'The when clause of the matching extension welcome view, if any.' };
					};
					type ChatSetupTimeoutRecoveryEvent = {
						agentActivated: boolean;
						agentReady: boolean;
						agentHasDefault: boolean;
						agentDefaultIsCore: boolean;
						agentHasContributedDefault: boolean;
						agentContributedDefaultIsCore: boolean;
						agentActivatedCount: number;
						agentLocation: string;
						agentModeKind: string;
						languageModelReady: boolean;
						languageModelCount: number;
						languageModelDefaultCount: number;
						languageModelHasRequestedModel: boolean;
						toolsModelReady: boolean;
						isRemote: boolean;
						isAnonymous: boolean;
						matchingWelcomeViewWhen: string;
					};

					this.telemetryService.publicLog2<ChatSetupTimeoutRecoveryEvent, ChatSetupTimeoutRecoveryClassification>('chatSetup.timeoutRecovery', recoveryDiagnosticInfo);
				}
			} finally {
				disposables.dispose();
			}
		}

		markChatGlobal(ChatGlobalPerfMark.DidWaitForActivation);
		await chatService.resendRequest(requestModel, {
			...widget?.getModeRequestOptions(),
			modeInfo,
			userSelectedModelId: widget?.input.currentLanguageModel
		});
	}

	private async whenPanelAgentHasGuidance(disposables: DisposableStore): Promise<void> {
		const panelAgentHasGuidance = () => chatViewsWelcomeRegistry.get().some(descriptor => this.contextKeyService.contextMatchesRules(descriptor.when));

		if (panelAgentHasGuidance()) {
			return;
		}

		return new Promise<void>(resolve => {
			let descriptorKeys: Set<string> = new Set();
			const updateDescriptorKeys = () => {
				const descriptors = chatViewsWelcomeRegistry.get();
				descriptorKeys = new Set(descriptors.flatMap(d => d.when.keys()));
			};
			updateDescriptorKeys();

			const onDidChangeRegistry = Event.map(chatViewsWelcomeRegistry.onDidChange, () => 'registry' as const);
			const onDidChangeRelevantContext = Event.map(
				Event.filter(this.contextKeyService.onDidChangeContext, e => e.affectsSome(descriptorKeys)),
				() => 'context' as const
			);

			disposables.add(Event.any(
				onDidChangeRegistry,
				onDidChangeRelevantContext
			)(source => {
				if (source === 'registry') {
					updateDescriptorKeys();
				}
				if (panelAgentHasGuidance()) {
					resolve();
				}
			}));
		});
	}

	private whenLanguageModelReady(languageModelsService: ILanguageModelsService, modelId: string | undefined): Promise<unknown> | void {
		const hasModelForRequest = () => {
			if (modelId) {
				return !!languageModelsService.lookupLanguageModel(modelId);
			}

			for (const id of languageModelsService.getLanguageModelIds()) {
				const model = languageModelsService.lookupLanguageModel(id);
				if (model?.isDefaultForLocation[ChatAgentLocation.Chat]) {
					return true;
				}
			}

			return false;
		};

		if (hasModelForRequest()) {
			return;
		}

		return Event.toPromise(Event.filter(languageModelsService.onDidChangeLanguageModels, () => hasModelForRequest()));
	}

	private whenToolsModelReady(languageModelToolsService: ILanguageModelToolsService, requestModel: IChatRequestModel): Promise<unknown> | void {
		const needsToolsModel = requestModel.message.parts.some(part => part instanceof ChatRequestToolPart);
		if (!needsToolsModel) {
			return; // No tools in this request, no need to check
		}

		// check that tools other than setup. and internal tools are registered.
		for (const tool of languageModelToolsService.getAllToolsIncludingDisabled()) {
			if (tool.id.startsWith('copilot_')) {
				return; // we have tools!
			}
		}

		return Event.toPromise(Event.filter(languageModelToolsService.onDidChangeTools, () => {
			for (const tool of languageModelToolsService.getAllToolsIncludingDisabled()) {
				if (tool.id.startsWith('copilot_')) {
					return true; // we have tools!
				}
			}

			return false; // no external tools found
		}));
	}

	private whenAgentReady(chatAgentService: IChatAgentService, mode: ChatModeKind | undefined): Promise<unknown> | void {
		const defaultAgent = chatAgentService.getDefaultAgent(this.location, mode);
		if (defaultAgent && !defaultAgent.isCore) {
			return; // we have a default agent from an extension!
		}

		return Event.toPromise(Event.filter(chatAgentService.onDidChangeAgents, () => {
			const defaultAgent = chatAgentService.getDefaultAgent(this.location, mode);
			return Boolean(defaultAgent && !defaultAgent.isCore);
		}));
	}

	private async whenAgentActivated(chatService: IChatService): Promise<void> {
		try {
			await chatService.activateDefaultAgent(this.location);
		} catch (error) {
			this.logService.error(error);
		}
	}

	private computeDiagnosticInfo(agentActivated: boolean, agentReady: boolean, languageModelReady: boolean, toolsModelReady: boolean, requestModel: IChatRequestModel, languageModelsService: ILanguageModelsService, chatAgentService: IChatAgentService, modeInfo: { kind?: ChatModeKind } | undefined) {
		const languageModelIds = languageModelsService.getLanguageModelIds();
		let languageModelDefaultCount = 0;
		for (const id of languageModelIds) {
			const model = languageModelsService.lookupLanguageModel(id);
			if (model?.isDefaultForLocation[ChatAgentLocation.Chat]) {
				languageModelDefaultCount++;
			}
		}

		const defaultAgent = chatAgentService.getDefaultAgent(this.location, modeInfo?.kind);
		const contributedDefaultAgent = chatAgentService.getContributedDefaultAgent(this.location);
		const chatViewPane = this.viewsService.getActiveViewWithId(ChatViewId) as ChatViewPane | undefined;
		const matchingWelcomeView = chatViewPane?.getMatchingWelcomeView();

		return {
			agentActivated,
			agentReady,
			agentHasDefault: !!defaultAgent,
			agentDefaultIsCore: defaultAgent?.isCore ?? false,
			agentHasContributedDefault: !!contributedDefaultAgent,
			agentContributedDefaultIsCore: contributedDefaultAgent?.isCore ?? false,
			agentActivatedCount: chatAgentService.getActivatedAgents().length,
			agentLocation: this.location,
			agentModeKind: modeInfo?.kind ?? '',
			languageModelReady,
			languageModelCount: languageModelIds.length,
			languageModelDefaultCount,
			languageModelHasRequestedModel: !!requestModel.modelId,
			toolsModelReady,
			isRemote: !!this.environmentService.remoteAuthority,
			isAnonymous: this.chatEntitlementService.anonymous,
			matchingWelcomeViewWhen: matchingWelcomeView?.when.serialize() ?? (chatViewPane ? 'noWelcomeView' : 'noChatViewPane'),
		};
	}

	private async doInvokeWithSetup(request: IChatAgentRequest, progress: (part: IChatProgress) => void, chatService: IChatService, languageModelsService: ILanguageModelsService, chatWidgetService: IChatWidgetService, chatAgentService: IChatAgentService, languageModelToolsService: ILanguageModelToolsService, defaultAccountService: IDefaultAccountService): Promise<IChatAgentResult> {
		this.telemetryService.publicLog2<WorkbenchActionExecutedEvent, WorkbenchActionExecutedClassification>('workbenchActionExecuted', { id: CHAT_SETUP_ACTION_ID, from: 'chat' });

		if (await this.handleTitaniumWorkflowRequest(request, progress)) {
			return {};
		}

		if (
			this.context.state.entitlement === ChatEntitlement.Unknown &&
			!this.chatEntitlementService.anonymous
		) {
			progress({
				kind: 'markdownContent',
				content: this.workspaceTrustManagementService.isWorkspaceTrusted() ? SetupAgent.DEMO_READY_MESSAGE : SetupAgent.TRUST_NEEDED_MESSAGE
			});

			return {};
		}

		const widget = chatWidgetService.getWidgetBySessionResource(request.sessionResource);
		const requestModel = widget?.viewModel?.model.getRequests().at(-1);

		const setupListener = Event.runAndSubscribe(this.controller.value.onDidChange, (() => {
			switch (this.controller.value.step) {
				case ChatSetupStep.SigningIn:
					progress({
						kind: 'progressMessage',
						content: new MarkdownString(localize('setupChatSignIn2', "Signing in to {0}", defaultAccountService.getDefaultAccountAuthenticationProvider().name)),
						shimmer: true,
					});
					break;
				case ChatSetupStep.Installing:
					progress({
						kind: 'progressMessage',
						content: new MarkdownString(localize('installingChat', "Getting chat ready")),
						shimmer: true,
					});
					break;
			}
		}));

		let result: IChatSetupResult | undefined = undefined;
		try {
			result = await ChatSetup.getInstance(this.instantiationService, this.context, this.controller).run({
				disableChatViewReveal: true, 																				// we are already in a chat context
				forceAnonymous: this.chatEntitlementService.anonymous ? ChatSetupAnonymous.EnabledWithoutDialog : undefined	// only enable anonymous selectively
			});
		} catch (error) {
			this.logService.error(`[chat setup] Error during setup: ${toErrorMessage(error)}`);
		} finally {
			setupListener.dispose();
		}

		// User has agreed to run the setup
		if (typeof result?.success === 'boolean') {
			if (result.success) {
				if (result.dialogSkipped) {
					await widget?.clear(); // make room for the Chat welcome experience
				} else if (requestModel) {
					let newRequest = this.replaceAgentInRequestModel(requestModel, chatAgentService); 	// Replace agent part with the actual Chat agent...
					newRequest = this.replaceToolInRequestModel(newRequest); 							// ...then replace any tool parts with the actual Chat tools

					await this.forwardRequestToChat(newRequest, progress, chatService, languageModelsService, chatAgentService, chatWidgetService, languageModelToolsService);
				}
			} else {
				progress({
					kind: 'warning',
					content: new MarkdownString(localize('chatSetupError', "Chat setup failed."))
				});
			}
		}

		// User has cancelled the setup
		else {
			progress({
				kind: 'markdownContent',
				content: this.workspaceTrustManagementService.isWorkspaceTrusted() ? SetupAgent.DEMO_READY_MESSAGE : SetupAgent.TRUST_NEEDED_MESSAGE
			});
		}

		return {};
	}

	async provideFollowups(request: IChatAgentRequest, _result: IChatAgentResult, _history: IChatAgentHistoryEntry[], _token: CancellationToken): Promise<IChatFollowup[]> {
		const state = this.titaniumWorkflowStates.get(request.sessionResource);
		if (!state) {
			return [];
		}

		if (state.phase === 'planning' || state.phase === 'ready') {
			return [];
		}

		return [];
	}

	private async handleTitaniumWorkflowRequest(request: IChatAgentRequest, progress: (part: IChatProgress) => void): Promise<boolean> {
		const state = this.titaniumWorkflowStates.get(request.sessionResource);
		const normalizedMessage = this.normalizeTitaniumWorkflowMessage(request.message);

		if (state) {
			state.lastUserMessage = request.message;

			if (this.isTitaniumWorkflowPlanReplayRequest(normalizedMessage)) {
				state.planStep = 0;
				state.selectedChoices = [];
				await this.runTitaniumWorkflowPlan(state, progress, true);
				return true;
			}

			const requestedStage = this.getRequestedTitaniumWorkflowStage(normalizedMessage);
			if (requestedStage && !this.isTitaniumWorkflowStartRequest(normalizedMessage) && (state.phase === 'done' || requestedStage === state.stage)) {
				const isCurrentStage = requestedStage === state.stage;
				state.stage = requestedStage;
				state.phase = 'planning';
				state.planStep = 0;
				state.selectedChoices = [];
				await this.runTitaniumWorkflowPlan(state, progress, isCurrentStage);
				return true;
			}

			if (state.phase === 'planning' || state.phase === 'ready') {
				const choice = this.getTitaniumWorkflowChoiceSelection(request.message);
				if (choice) {
					await this.handleTitaniumWorkflowChoice(state, choice, progress);
					return true;
				}

				if (this.isTitaniumWorkflowStartRequest(normalizedMessage)) {
					state.phase = 'running';
					await this.runTitaniumWorkflowStage(state, progress);
					return true;
				}

				await this.runTitaniumWorkflowPlan(state, progress, true);
				return true;
			}

			if (state.phase === 'done') {
				const nextStage = this.getNextTitaniumWorkflowStage(state.stage);
				if (nextStage && this.isTitaniumWorkflowContinueRequest(normalizedMessage, nextStage)) {
					state.stage = nextStage;
					state.phase = 'planning';
					state.planStep = 0;
					state.selectedChoices = [];
					await this.runTitaniumWorkflowPlan(state, progress, false);
					return true;
				}
			}
		}

		const requestedInitialStage = this.getRequestedTitaniumWorkflowStage(normalizedMessage);
		if (!normalizedMessage.includes(TITANIUM_WORKFLOW_TRIGGER) && !requestedInitialStage) {
			return false;
		}
		const initialStage = requestedInitialStage ?? 'v0';

		const targetRoot = this.getTitaniumWorkflowTargetRoot();
		if (!targetRoot) {
			progress({
				kind: 'warning',
				content: new MarkdownString('当前没有打开工作区文件夹，无法创建 v0-v3 独立站项目。')
			});
			return true;
		}

		const nextState: ITitaniumWorkflowState = {
			stage: initialStage,
			phase: 'planning',
			targetRoot,
			lastUserMessage: request.message,
			planStep: 0,
			selectedChoices: []
		};
		this.titaniumWorkflowStates.set(request.sessionResource, nextState);
		await this.runTitaniumWorkflowPlan(nextState, progress, false);
		return true;
	}

	private async runTitaniumWorkflowPlan(state: ITitaniumWorkflowState, progress: (part: IChatProgress) => void, isRevision: boolean): Promise<void> {
		const config = TITANIUM_WORKFLOW_STAGES[state.stage];
		state.phase = 'planning';

		progress({
			kind: 'progressMessage',
			content: new MarkdownString(isRevision ? `正在重新整理 ${state.stage} 的实现计划。` : `正在分析 ${state.stage} 阶段需求并检查实现边界。`),
			shimmer: true
		});
		await timeout(TITANIUM_WORKFLOW_PROGRESS_DELAY);

		await this.reportTitaniumWorkflowMarkdownStream(this.createTitaniumWorkflowInteractivePlanIntro(config), progress);
		await this.reportTitaniumWorkflowChoiceQuestion(state, progress);

		state.phase = 'ready';
	}

	private createTitaniumWorkflowInteractivePlanIntro(config: ITitaniumWorkflowStageConfig): string {
		return [
			`## ${config.title}`,
			'',
			config.planIntro,
			'',
			config.stage === 'v0'
				? '我已理解当前边界：这是 Node.js 生态下的英文独立站工程基础，后续要能扩展图片、视频、OBJ/MTL 3D 和英文客服；v0 只做项目初始化，不做完整商品页。下面只确认仍需决策的技术方案。'
				: '我先不写代码。接下来会按真实 AI 编程的 Plan 流程逐项确认需求：每次只选择一个问题，选完后我会汇总成需求文档，再进入编码阶段。',
			'',
			'请先从第一个问题开始选择。'
		].join('\n');
	}

	private async handleTitaniumWorkflowChoice(state: ITitaniumWorkflowState, choice: string, progress: (part: IChatProgress) => void): Promise<void> {
		const config = TITANIUM_WORKFLOW_STAGES[state.stage];
		const option = config.options[state.planStep];
		if (!option) {
			await this.runTitaniumWorkflowPlan(state, progress, true);
			return;
		}

		const normalizedChoice = choice.toUpperCase();
		const choiceLabel = this.getTitaniumWorkflowChoiceLabel(option.body, normalizedChoice) ?? normalizedChoice;
		state.selectedChoices[state.planStep] = `${option.title} ${choiceLabel}`;
		state.planStep++;

		progress({
			kind: 'markdownContent',
			content: new MarkdownString(`已选择：${option.title} ${choiceLabel}`)
		});

		if (state.planStep < config.options.length) {
			await this.reportTitaniumWorkflowChoiceQuestion(state, progress);
			return;
		}

		await this.reportTitaniumWorkflowMarkdownStream(this.createTitaniumWorkflowConfirmedRequirementsMarkdown(config, state), progress);
		this.reportTitaniumWorkflowSubmitButton(this.getTitaniumWorkflowStartButtonTitle(state.stage), `使用已确认方案并开始 ${state.stage}`, progress);
	}

	private async reportTitaniumWorkflowChoiceQuestion(state: ITitaniumWorkflowState, progress: (part: IChatProgress) => void): Promise<void> {
		const config = TITANIUM_WORKFLOW_STAGES[state.stage];
		const option = config.options[state.planStep];
		if (!option) {
			return;
		}

		await this.reportTitaniumWorkflowMarkdownStream([
			`### 问题 ${state.planStep + 1}/${config.options.length}：${option.title}`,
			'',
			option.body,
			'',
			'请选择一个方案：'
		].join('\n'), progress, 260);

		for (const choice of this.getTitaniumWorkflowChoiceLetters(option.body)) {
			const title = this.getTitaniumWorkflowChoiceLabel(option.body, choice) ?? choice;
			this.reportTitaniumWorkflowSubmitButton(title, `选择 ${option.title} ${choice}`, progress);
		}
	}

	private async reportTitaniumWorkflowMarkdownStream(markdown: string, progress: (part: IChatProgress) => void, delay = 520): Promise<void> {
		for (const chunk of this.createTitaniumWorkflowMarkdownChunks(markdown)) {
			progress({
				kind: 'markdownContent',
				content: new MarkdownString(chunk)
			});
			await timeout(delay);
		}
	}

	private createTitaniumWorkflowMarkdownChunks(markdown: string): string[] {
		const blocks = markdown.split(/\n{2,}/).map(block => block.trim()).filter(Boolean);
		return blocks.map(block => `${block}\n\n`);
	}

	private reportTitaniumWorkflowSubmitButton(title: string, inputValue: string, progress: (part: IChatProgress) => void): void {
		progress({
			kind: 'command',
			command: {
				id: ChatSubmitAction.ID,
				title,
				arguments: [{ inputValue }]
			}
		});
	}

	private getTitaniumWorkflowStartButtonTitle(stage: TitaniumWorkflowStage): string {
		switch (stage) {
			case 'v0':
				return '开始创建项目基础代码';
			case 'v1':
				return '开始编写基础商品页';
			case 'v2':
				return '开始升级品牌媒体页';
			case 'v3':
				return '开始接入 3D 与客服';
		}
	}

	private getTitaniumWorkflowChoiceLetters(body: string): string[] {
		return body.split('\n')
			.map(line => /^([A-Z])\.\s+/.exec(line)?.[1])
			.filter((letter): letter is string => !!letter);
	}

	private getTitaniumWorkflowChoiceLabel(body: string, choice: string): string | undefined {
		const line = body.split('\n').find(candidate => candidate.startsWith(`${choice}. `));
		if (!line) {
			return undefined;
		}

		const rawLabel = line.slice(3);
		const splitIndex = rawLabel.search(/[：:]/);
		return splitIndex >= 0 ? `${choice}. ${rawLabel.slice(0, splitIndex)}` : `${choice}. ${rawLabel}`;
	}

	private getTitaniumWorkflowChoiceSelection(message: string): string | undefined {
		return /选择\s+.+\s+([A-Z])\s*$/i.exec(message.trim())?.[1];
	}

	private createTitaniumWorkflowConfirmedRequirementsMarkdown(config: ITitaniumWorkflowStageConfig, state: ITitaniumWorkflowState): string {
		const lines = [
			'### 已确认选择',
			'',
			...state.selectedChoices.map(choice => `- ${choice}`),
			'',
			'### 需求文档',
			''
		];

		for (const item of config.requirementDraft ?? []) {
			lines.push(`- ${item}`);
		}

		lines.push('');
		lines.push('我会按上面的选择创建 v0 工程基础。下一步只生成最小可运行项目和基础说明，不做完整商品页、视频、3D 模型或客服。');
		return lines.join('\n');
	}

	private async runTitaniumWorkflowStage(state: ITitaniumWorkflowState, progress: (part: IChatProgress) => void): Promise<void> {
		const config = TITANIUM_WORKFLOW_STAGES[state.stage];
		const sourceStageRoot = URI.joinPath(this.getTitaniumWorkflowSourceRoot(), state.stage);
		const targetStageRoot = URI.joinPath(state.targetRoot, state.stage);

		if (!await this.fileService.exists(sourceStageRoot)) {
			progress({
				kind: 'warning',
				content: new MarkdownString('当前缺少本轮演示所需的本地材料，无法继续生成该阶段。')
			});
			state.phase = 'ready';
			return;
		}

		progress({
			kind: 'progressMessage',
			content: new MarkdownString(config.checkMessage),
			shimmer: true
		});
		await timeout(TITANIUM_WORKFLOW_PROGRESS_DELAY);

		const inspectionSummary = await this.createTitaniumWorkflowInspectionSummary(state.stage);
		if (inspectionSummary) {
			progress({
				kind: 'markdownContent',
				content: new MarkdownString(inspectionSummary)
			});
			await timeout(TITANIUM_WORKFLOW_PROGRESS_DELAY);
		}

		progress({
			kind: 'progressMessage',
			content: new MarkdownString(config.codingMessage),
			shimmer: true
		});
		await this.materializeTitaniumWorkflowStage(sourceStageRoot, targetStageRoot);

		for (const streamedFile of config.streamedFiles) {
			const sourceFile = URI.joinPath(sourceStageRoot, ...streamedFile.relativePath.split('/'));
			const targetFile = URI.joinPath(targetStageRoot, ...streamedFile.relativePath.split('/'));
			if (this.isTitaniumWorkflowRunScript(streamedFile.relativePath)) {
				const content = this.createTitaniumWorkflowRunScript(state.stage);
				await this.streamTitaniumWorkflowFile(targetFile, content, streamedFile.label, streamedFile.language, streamedFile.message, progress);
			} else if (await this.fileService.exists(sourceFile)) {
				const content = await this.readTitaniumWorkflowFile(sourceFile);
				await this.streamTitaniumWorkflowFile(targetFile, content, streamedFile.label, streamedFile.language, streamedFile.message, progress);
			}
		}
		await this.writeTitaniumWorkflowRunScripts(targetStageRoot);

		progress({
			kind: 'progressMessage',
			content: new MarkdownString('正在检查页面结构、关键资源路径和本地预览入口。'),
			shimmer: true
		});
		await timeout(TITANIUM_WORKFLOW_PROGRESS_DELAY);

		progress({
			kind: 'treeData',
			treeData: await this.createTitaniumWorkflowTreeData(targetStageRoot)
		});

		progress({
			kind: 'markdownContent',
			content: new MarkdownString([
				config.doneMessage,
				'',
				`本阶段产物：\`${state.stage}\``,
				state.stage === 'v3' ? 'v0-v3 教学演示流程已经完整结束。' : ''
			].join('\n'))
		});

		state.phase = 'done';
	}

	private getTitaniumWorkflowTargetRoot(): URI | undefined {
		const workspaceFolder = this.workspaceContextService.getWorkspace().folders[0];
		if (!workspaceFolder) {
			return undefined;
		}

		const folderName = workspaceFolder.uri.path.split('/').at(-1);
		return folderName === TITANIUM_WORKFLOW_DIR
			? workspaceFolder.uri
			: URI.joinPath(workspaceFolder.uri, TITANIUM_WORKFLOW_DIR);
	}

	private getTitaniumWorkflowSourceRoot(): URI {
		return URI.joinPath(URI.file(dirname(FileAccess.asFileUri('').fsPath)), TITANIUM_WORKFLOW_SOURCE_DIR);
	}

	private normalizeTitaniumWorkflowMessage(message: string): string {
		return message.toLowerCase().replace(/[\s,，。.!！?？:：;；'"`~]+/g, '');
	}

	private isTitaniumWorkflowStartRequest(normalizedMessage: string): boolean {
		return normalizedMessage.includes('使用推荐方案并开始')
			|| normalizedMessage.includes('推荐方案并开始')
			|| normalizedMessage.includes('按推荐开始')
			|| normalizedMessage.includes('开始')
			|| normalizedMessage.includes('确认');
	}

	private isTitaniumWorkflowPlanReplayRequest(normalizedMessage: string): boolean {
		return normalizedMessage.includes('重新查看') || normalizedMessage.includes('重看计划');
	}

	private isTitaniumWorkflowContinueRequest(normalizedMessage: string, nextStage: TitaniumWorkflowStage): boolean {
		return normalizedMessage.includes('继续') || normalizedMessage.includes(`做${nextStage}`) || normalizedMessage.includes(nextStage);
	}

	private getRequestedTitaniumWorkflowStage(normalizedMessage: string): TitaniumWorkflowStage | undefined {
		return TITANIUM_WORKFLOW_STAGE_ORDER.find(stage => normalizedMessage.includes(stage));
	}

	private getNextTitaniumWorkflowStage(stage: TitaniumWorkflowStage): TitaniumWorkflowStage | undefined {
		const index = TITANIUM_WORKFLOW_STAGE_ORDER.indexOf(stage);
		return TITANIUM_WORKFLOW_STAGE_ORDER[index + 1];
	}

	private async createTitaniumWorkflowInspectionSummary(stage: TitaniumWorkflowStage): Promise<string> {
		if (stage === 'v0') {
			return [
				'检查结果：',
				'- 已确认本阶段只建立工程基础，不进入完整商品页。',
				'- 技术栈会为后续图片、视频、OBJ/MTL 3D 和英文客服预留空间。'
			].join('\n');
		}

		if (stage === 'v1' || stage === 'v2') {
			const assetsRoot = URI.joinPath(this.getTitaniumWorkflowSourceRoot(), 'assets', 'products');
			const mediaNames = await this.listTitaniumWorkflowChildNames(assetsRoot, child => child.isFile && /\.(jpg|jpeg|png|webp|mp4)$/i.test(child.name));
			const shownNames = mediaNames.slice(0, 10);
			return [
				'检查结果：',
				`- 已确认可用产品素材 ${mediaNames.length} 个。`,
				shownNames.length ? `- 代表素材：${shownNames.map(name => `\`${name}\``).join('、')}` : '- 当前未发现可用图片或视频素材。',
				stage === 'v1'
					? '- 本阶段保持基础商品页范围，不加入视频、3D 或客服。'
					: '- 本阶段会使用图片和视频增强品牌媒体表达，但不加入 3D 或客服。'
			].join('\n');
		}

		const modelRoot = URI.joinPath(this.getTitaniumWorkflowSourceRoot(), 'assets', 'products', 'model', 'person-cup');
		const modelNames = await this.listTitaniumWorkflowChildNames(modelRoot, child => child.isFile && /\.(obj|mtl|png)$/i.test(child.name));
		return [
			'检查结果：',
			'- 已确认真实 3D 模型素材。',
			...modelNames.map(name => `- \`${name}\``),
			'- 本阶段会保留原始 OBJ/MTL/贴图，不压缩、不转 GLB、不替换模型。'
		].join('\n');
	}

	private async listTitaniumWorkflowChildNames(resource: URI, predicate: (child: IFileStat) => boolean): Promise<string[]> {
		if (!await this.fileService.exists(resource)) {
			return [];
		}

		const stat = await this.fileService.resolve(resource);
		return (stat.children ?? [])
			.filter(predicate)
			.map(child => child.name)
			.sort((a, b) => a.localeCompare(b));
	}

	private async materializeTitaniumWorkflowStage(source: URI, target: URI): Promise<void> {
		await this.ensureTitaniumWorkflowFolder(target);
		await this.materializeTitaniumWorkflowDirectory(source, target);
		await this.writeTitaniumWorkflowRunScripts(target);
	}

	private async materializeTitaniumWorkflowDirectory(source: URI, target: URI): Promise<void> {
		const sourceStat = await this.fileService.resolve(source);
		for (const child of sourceStat.children ?? []) {
			if (TITANIUM_WORKFLOW_IGNORED_NAMES.has(child.name)) {
				continue;
			}

			const targetChild = URI.joinPath(target, child.name);
			if (child.isDirectory) {
				await this.ensureTitaniumWorkflowFolder(targetChild);
				await this.materializeTitaniumWorkflowDirectory(child.resource, targetChild);
			} else if (child.isFile) {
				await this.ensureTitaniumWorkflowFolder(this.getTitaniumWorkflowParent(targetChild));
				const content = await this.fileService.readFile(child.resource);
				await this.fileService.writeFile(targetChild, content.value);
			}
		}
	}

	private async writeTitaniumWorkflowRunScripts(stageRoot: URI): Promise<void> {
		const stageName = stageRoot.path.split('/').at(-1);
		if (!stageName || !TITANIUM_WORKFLOW_STAGE_ORDER.includes(stageName as TitaniumWorkflowStage)) {
			return;
		}

		const stage = stageName as TitaniumWorkflowStage;
		const script = this.createTitaniumWorkflowRunScript(stage);
		await this.fileService.writeFile(URI.joinPath(stageRoot, `run-${stage}.cmd`), VSBuffer.fromString(script));
		await this.fileService.writeFile(URI.joinPath(stageRoot, `启动-${stage}-页面.bat`), VSBuffer.fromString(script));
		await this.rewriteTitaniumWorkflowPortNotes(stageRoot, stage);
	}

	private async rewriteTitaniumWorkflowPortNotes(stageRoot: URI, stage: TitaniumWorkflowStage): Promise<void> {
		const port = this.getTitaniumWorkflowPreviewPort(stage);
		await this.rewriteTitaniumWorkflowPortNotesInDirectory(stageRoot, port);
	}

	private async rewriteTitaniumWorkflowPortNotesInDirectory(resource: URI, port: number): Promise<void> {
		if (!await this.fileService.exists(resource)) {
			return;
		}

		const stat = await this.fileService.resolve(resource);
		for (const child of stat.children ?? []) {
			if (TITANIUM_WORKFLOW_IGNORED_NAMES.has(child.name)) {
				continue;
			}

			if (child.isDirectory) {
				await this.rewriteTitaniumWorkflowPortNotesInDirectory(child.resource, port);
				continue;
			}

			if (!child.isFile || (child.name !== 'README.md' && child.name !== 'V1_TO_V2_CHANGES.md')) {
				continue;
			}

			const content = await this.readTitaniumWorkflowFile(child.resource);
			const updated = content
				.replaceAll('http://127.0.0.1:3000', `http://127.0.0.1:${port}`)
				.replaceAll('http://localhost:3000', `http://localhost:${port}`)
				.replaceAll('--port 3000', `--port ${port}`);
			if (updated !== content) {
				await this.fileService.writeFile(child.resource, VSBuffer.fromString(updated));
			}
		}
	}

	private isTitaniumWorkflowRunScript(relativePath: string): boolean {
		return /^run-v\d\.cmd$/i.test(relativePath);
	}

	private createTitaniumWorkflowRunScript(stage: TitaniumWorkflowStage): string {
		const sourceRoot = this.getTitaniumWorkflowSourceRoot().fsPath;
		const cacheDir = `${sourceRoot}\\${stage}\\titanium-cup-showcase\\node_modules`;
		const sharedCacheDir = `${sourceRoot}\\node_modules`;
		const port = this.getTitaniumWorkflowPreviewPort(stage);
		return [
			'@echo off',
			'setlocal',
			'',
			'set "PROJECT_DIR=%~dp0titanium-cup-showcase"',
			`set "CACHE_NODE_MODULES=${cacheDir}"`,
			`set "SHARED_CACHE_NODE_MODULES=${sharedCacheDir}"`,
			`set "PORT=${port}"`,
			'set "URL=http://127.0.0.1:%PORT%"',
			'',
			'if exist "%PROJECT_DIR%\\package.json" goto project_ok',
			'echo Project package.json not found:',
			'echo %PROJECT_DIR%\\package.json',
			'pause',
			'exit /b 1',
			'',
			':project_ok',
			'cd /d "%PROJECT_DIR%"',
			'',
			'if "%~1"=="--check" goto check_only',
			'',
			'if exist "node_modules\\next" goto deps_ok',
			'echo Installing dependencies...',
			'if exist "%CACHE_NODE_MODULES%\\next" goto copy_stage_cache',
			'if exist "%SHARED_CACHE_NODE_MODULES%\\next" set "CACHE_NODE_MODULES=%SHARED_CACHE_NODE_MODULES%"',
			'if not exist "%CACHE_NODE_MODULES%\\next" goto deps_missing',
			'',
			':copy_stage_cache',
			'robocopy "%CACHE_NODE_MODULES%" "node_modules" /E /NFL /NDL /NJH /NJS /NP >nul',
			'if %ERRORLEVEL% GEQ 8 goto deps_failed',
			'',
			':deps_ok',
			`echo Starting ${stage} page...`,
			'echo URL: %URL%',
			'start "" "%URL%"',
			'call npm run dev -- --hostname 127.0.0.1 --port %PORT%',
			'pause',
			'exit /b 0',
			'',
			':deps_missing',
			'echo Installing dependencies failed.',
			'echo Local dependency cache was not found.',
			'pause',
			'exit /b 1',
			'',
			':deps_failed',
			'echo Installing dependencies failed.',
			'pause',
			'exit /b 1',
			'',
			':check_only',
			'echo Current directory:',
			'cd',
			'call npm run',
			'exit /b %errorlevel%',
			''
		].join('\r\n');
	}

	private getTitaniumWorkflowPreviewPort(stage: TitaniumWorkflowStage): number {
		switch (stage) {
			case 'v1':
				return 3001;
			case 'v2':
				return 3002;
			case 'v3':
				return 3003;
			default:
				return 3000;
		}
	}

	private async ensureTitaniumWorkflowFolder(resource: URI): Promise<void> {
		if (await this.fileService.exists(resource)) {
			return;
		}

		const parent = this.getTitaniumWorkflowParent(resource);
		if (parent.toString() !== resource.toString() && !await this.fileService.exists(parent)) {
			await this.ensureTitaniumWorkflowFolder(parent);
		}

		await this.fileService.createFolder(resource);
	}

	private getTitaniumWorkflowParent(resource: URI): URI {
		const segments = resource.path.split('/').filter(Boolean);
		if (segments.length <= 1) {
			return resource;
		}

		const parentPath = segments.slice(0, -1).join('/');
		const prefix = resource.path.startsWith('/') ? '/' : '';
		return resource.with({ path: `${prefix}${parentPath}` });
	}

	private async readTitaniumWorkflowFile(resource: URI): Promise<string> {
		const content = await this.fileService.readFile(resource);
		return content.value.toString();
	}

	private async streamTitaniumWorkflowFile(resource: URI, content: string, label: string, language: string, message: string, progress: (part: IChatProgress) => void): Promise<void> {
		progress({
			kind: 'progressMessage',
			content: new MarkdownString(message),
			shimmer: true
		});

		await this.openTitaniumWorkflowEditor(resource);
		const frameDelays = this.createTitaniumWorkflowFrameDelays(TITANIUM_WORKFLOW_SECTION_DELAY, TITANIUM_WORKFLOW_STREAM_FRAMES);
		for (let index = 1; index <= TITANIUM_WORKFLOW_STREAM_FRAMES; index++) {
			const partialContent = this.takeTitaniumWorkflowChunk(content, index, TITANIUM_WORKFLOW_STREAM_FRAMES);
			await this.fileService.writeFile(resource, VSBuffer.fromString(partialContent));
			await this.openTitaniumWorkflowEditorAtEnd(resource, partialContent);
			await timeout(frameDelays[index - 1]);
		}

		progress({
			kind: 'markdownContent',
			content: new MarkdownString(`已完成 \`${label}\`。`)
		});
	}

	private createTitaniumWorkflowFrameDelays(totalDelay: number, frames: number): number[] {
		const delays: number[] = [];
		let assigned = 0;

		for (let index = 0; index < frames; index++) {
			const delay = Math.max(120, Math.round(totalDelay / frames));
			delays.push(delay);
			assigned += delay;
		}

		delays[delays.length - 1] += totalDelay - assigned;
		return delays;
	}

	private takeTitaniumWorkflowChunk(content: string, index: number, total: number): string {
		const normalizedContent = content.replace(/\r\n/g, '\n');
		const targetLength = Math.max(1, Math.min(normalizedContent.length, Math.ceil(normalizedContent.length * (index / total))));
		if (targetLength >= normalizedContent.length) {
			return normalizedContent;
		}

		const lookahead = Math.min(normalizedContent.length, targetLength + 80);
		for (let cursor = targetLength; cursor < lookahead; cursor++) {
			const currentChar = normalizedContent[cursor];
			if (currentChar === '\n' || currentChar === '>' || currentChar === ' ') {
				return normalizedContent.slice(0, cursor + 1);
			}
		}

		return normalizedContent.slice(0, targetLength);
	}

	private async openTitaniumWorkflowEditor(resource: URI): Promise<void> {
		await this.editorService.openEditor({
			resource,
			options: {
				preserveFocus: false,
				revealIfOpened: true,
				pinned: true
			}
		});
	}

	private async openTitaniumWorkflowEditorAtEnd(resource: URI, content: string): Promise<void> {
		const position = this.createTitaniumWorkflowPosition(content, content.length);
		await this.editorService.openEditor({
			resource,
			options: {
				preserveFocus: false,
				revealIfOpened: true,
				pinned: true,
				selection: {
					startLineNumber: position.lineNumber,
					startColumn: position.column,
					endLineNumber: position.lineNumber,
					endColumn: position.column
				}
			}
		});
	}

	private createTitaniumWorkflowPosition(content: string, offset: number): { lineNumber: number; column: number } {
		let lineNumber = 1;
		let column = 1;
		for (let index = 0; index < offset; index++) {
			if (content.charCodeAt(index) === 10) {
				lineNumber++;
				column = 1;
			} else {
				column++;
			}
		}

		return { lineNumber, column };
	}

	private async createTitaniumWorkflowTreeData(stageRoot: URI): Promise<IChatResponseProgressFileTreeData> {
		const children = await this.createTitaniumWorkflowTreeChildren(stageRoot, 0);
		return {
			label: stageRoot.path.split('/').at(-1) ?? 'stage',
			uri: stageRoot,
			children
		};
	}

	private async createTitaniumWorkflowTreeChildren(resource: URI, depth: number): Promise<IChatResponseProgressFileTreeData[]> {
		if (depth > 2 || !await this.fileService.exists(resource)) {
			return [];
		}

		const stat = await this.fileService.resolve(resource);
		const children = (stat.children ?? [])
			.filter(child => !TITANIUM_WORKFLOW_IGNORED_NAMES.has(child.name))
			.sort((a, b) => Number(b.isDirectory) - Number(a.isDirectory) || a.name.localeCompare(b.name))
			.slice(0, depth === 0 ? 10 : 8);

		const treeItems: IChatResponseProgressFileTreeData[] = [];
		for (const child of children) {
			treeItems.push({
				label: child.name,
				uri: child.resource,
				children: child.isDirectory ? await this.createTitaniumWorkflowTreeChildren(child.resource, depth + 1) : undefined
			});
		}

		return treeItems;
	}

	private replaceAgentInRequestModel(requestModel: IChatRequestModel, chatAgentService: IChatAgentService): IChatRequestModel {
		const agentPart = requestModel.message.parts.find((r): r is ChatRequestAgentPart => r instanceof ChatRequestAgentPart);
		if (!agentPart) {
			return requestModel;
		}

		const agentId = agentPart.agent.id.replace(/setup\./, `${defaultChat.extensionId}.`.toLowerCase());
		const githubAgent = chatAgentService.getAgent(agentId);
		if (!githubAgent) {
			return requestModel;
		}

		const newAgentPart = new ChatRequestAgentPart(agentPart.range, agentPart.editorRange, githubAgent);

		return new ChatRequestModel({
			session: requestModel.session as ChatModel,
			message: {
				parts: requestModel.message.parts.map(part => {
					if (part instanceof ChatRequestAgentPart) {
						return newAgentPart;
					}
					return part;
				}),
				text: requestModel.message.text
			},
			variableData: requestModel.variableData,
			timestamp: Date.now(),
			attempt: requestModel.attempt,
			modeInfo: requestModel.modeInfo,
			confirmation: requestModel.confirmation,
			locationData: requestModel.locationData,
			attachedContext: requestModel.attachedContext,
			isCompleteAddedRequest: requestModel.isCompleteAddedRequest,
		});
	}

	private replaceToolInRequestModel(requestModel: IChatRequestModel): IChatRequestModel {
		const toolPart = requestModel.message.parts.find((r): r is ChatRequestToolPart => r instanceof ChatRequestToolPart);
		if (!toolPart) {
			return requestModel;
		}

		const toolId = toolPart.toolId.replace(/setup.tools\./, `copilot_`.toLowerCase());
		const newToolPart = new ChatRequestToolPart(
			toolPart.range,
			toolPart.editorRange,
			toolPart.toolName,
			toolId,
			toolPart.displayName,
			toolPart.icon
		);

		const chatRequestToolEntry: IChatRequestToolEntry = {
			id: toolId,
			name: 'new',
			range: toolPart.range,
			kind: 'tool',
			value: undefined
		};

		const variableData: IChatRequestVariableData = {
			variables: [chatRequestToolEntry]
		};

		return new ChatRequestModel({
			session: requestModel.session as ChatModel,
			message: {
				parts: requestModel.message.parts.map(part => {
					if (part instanceof ChatRequestToolPart) {
						return newToolPart;
					}
					return part;
				}),
				text: requestModel.message.text
			},
			variableData: variableData,
			timestamp: Date.now(),
			attempt: requestModel.attempt,
			modeInfo: requestModel.modeInfo,
			confirmation: requestModel.confirmation,
			locationData: requestModel.locationData,
			attachedContext: [chatRequestToolEntry],
			isCompleteAddedRequest: requestModel.isCompleteAddedRequest,
		});
	}
}

export class SetupTool implements IToolImpl {

	static registerTool(instantiationService: IInstantiationService, toolData: IToolData): IDisposable {
		return instantiationService.invokeFunction(accessor => {
			const toolService = accessor.get(ILanguageModelToolsService);

			const tool = instantiationService.createInstance(SetupTool);
			return toolService.registerTool(toolData, tool);
		});
	}

	async invoke(invocation: IToolInvocation, countTokens: CountTokensCallback, progress: ToolProgress, token: CancellationToken): Promise<IToolResult> {
		const result: IToolResult = {
			content: [
				{
					kind: 'text',
					value: ''
				}
			]
		};

		return result;
	}

	async prepareToolInvocation?(parameters: unknown, token: CancellationToken): Promise<IPreparedToolInvocation | undefined> {
		return undefined;
	}
}

export class AINewSymbolNamesProvider {

	static registerProvider(instantiationService: IInstantiationService, context: ChatEntitlementContext, controller: Lazy<ChatSetupController>): IDisposable {
		return instantiationService.invokeFunction(accessor => {
			const languageFeaturesService = accessor.get(ILanguageFeaturesService);

			const provider = instantiationService.createInstance(AINewSymbolNamesProvider, context, controller);
			return languageFeaturesService.newSymbolNamesProvider.register('*', provider);
		});
	}

	constructor(
		private readonly context: ChatEntitlementContext,
		private readonly controller: Lazy<ChatSetupController>,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IChatEntitlementService private readonly chatEntitlementService: IChatEntitlementService,
	) {
	}

	async provideNewSymbolNames(model: ITextModel, range: IRange, triggerKind: NewSymbolNameTriggerKind, token: CancellationToken): Promise<NewSymbolName[] | undefined> {
		await this.instantiationService.invokeFunction(accessor => {
			return ChatSetup.getInstance(this.instantiationService, this.context, this.controller).run({
				forceAnonymous: this.chatEntitlementService.anonymous ? ChatSetupAnonymous.EnabledWithDialog : undefined
			});
		});

		return [];
	}
}

export class ChatCodeActionsProvider {

	static registerProvider(instantiationService: IInstantiationService): IDisposable {
		return instantiationService.invokeFunction(accessor => {
			const languageFeaturesService = accessor.get(ILanguageFeaturesService);

			const provider = instantiationService.createInstance(ChatCodeActionsProvider);
			return languageFeaturesService.codeActionProvider.register('*', provider);
		});
	}

	constructor(
		@IMarkerService private readonly markerService: IMarkerService,
	) {
	}

	async provideCodeActions(model: ITextModel, range: Range | Selection): Promise<CodeActionList | undefined> {
		const actions: CodeAction[] = [];

		// "Generate" if the line is whitespace only
		// "Modify" if there is a selection
		let generateOrModifyTitle: string | undefined;
		let generateOrModifyCommand: Command | undefined;
		if (range.isEmpty()) {
			const textAtLine = model.getLineContent(range.startLineNumber);
			if (/^\s*$/.test(textAtLine)) {
				generateOrModifyTitle = localize('generate', "Generate");
				generateOrModifyCommand = AICodeActionsHelper.generate(range);
			}
		} else {
			const textInSelection = model.getValueInRange(range);
			if (!/^\s*$/.test(textInSelection)) {
				generateOrModifyTitle = localize('modify', "Modify");
				generateOrModifyCommand = AICodeActionsHelper.modify(range);
			}
		}

		if (generateOrModifyTitle && generateOrModifyCommand) {
			actions.push({
				kind: CodeActionKind.RefactorRewrite.append('copilot').value,
				isAI: true,
				title: generateOrModifyTitle,
				command: generateOrModifyCommand,
			});
		}

		const markers = AICodeActionsHelper.warningOrErrorMarkersAtRange(this.markerService, model.uri, range);
		if (markers.length > 0) {

			// "Fix" if there are diagnostics in the range
			actions.push({
				kind: CodeActionKind.QuickFix.append('copilot').value,
				isAI: true,
				diagnostics: markers,
				title: localize('fix', "Fix"),
				command: AICodeActionsHelper.fixMarkers(markers, range)
			});

			// "Explain" if there are diagnostics in the range
			actions.push({
				kind: CodeActionKind.QuickFix.append('explain').append('copilot').value,
				isAI: true,
				diagnostics: markers,
				title: localize('explain', "Explain"),
				command: AICodeActionsHelper.explainMarkers(markers)
			});
		}

		return {
			actions,
			dispose() { }
		};
	}
}

export class AICodeActionsHelper {

	static warningOrErrorMarkersAtRange(markerService: IMarkerService, resource: URI, range: Range | Selection): IMarker[] {
		return markerService
			.read({ resource, severities: MarkerSeverity.Error | MarkerSeverity.Warning })
			.filter(marker => range.startLineNumber <= marker.endLineNumber && range.endLineNumber >= marker.startLineNumber);
	}

	static modify(range: Range): Command {
		return {
			id: INLINE_CHAT_START,
			title: localize('modify', "Modify"),
			arguments: [
				{
					initialSelection: this.rangeToSelection(range),
					initialRange: range,
					position: range.getStartPosition()
				} satisfies { initialSelection: ISelection; initialRange: IRange; position: IPosition }
			]
		};
	}

	static generate(range: Range): Command {
		return {
			id: INLINE_CHAT_START,
			title: localize('generate', "Generate"),
			arguments: [
				{
					initialSelection: this.rangeToSelection(range),
					initialRange: range,
					position: range.getStartPosition()
				} satisfies { initialSelection: ISelection; initialRange: IRange; position: IPosition }
			]
		};
	}

	private static rangeToSelection(range: Range): ISelection {
		return new Selection(range.startLineNumber, range.startColumn, range.endLineNumber, range.endColumn);
	}

	static explainMarkers(markers: IMarker[]): Command {
		return {
			id: CHAT_OPEN_ACTION_ID,
			title: localize('explain', "Explain"),
			arguments: [
				{
					query: `@workspace /explain ${markers.map(marker => marker.message).join(', ')}`,
					isPartialQuery: true
				} satisfies { query: string; isPartialQuery: boolean }
			]
		};
	}

	static fixMarkers(markers: IMarker[], range: Range): Command {
		return {
			id: INLINE_CHAT_START,
			title: localize('fix', "Fix"),
			arguments: [
				{
					message: `/fix ${markers.map(marker => marker.message).join(', ')}`,
					initialSelection: this.rangeToSelection(range),
					initialRange: range,
					position: range.getStartPosition()
				} satisfies { message: string; initialSelection: ISelection; initialRange: IRange; position: IPosition }
			]
		};
	}
}
