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
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { Lazy } from '../../../../../base/common/lazy.js';
import { Disposable, DisposableStore, IDisposable, toDisposable } from '../../../../../base/common/lifecycle.js';
import { join } from '../../../../../base/common/path.js';
import { URI } from '../../../../../base/common/uri.js';
import { localize, localize2 } from '../../../../../nls.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
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

const SCRIPTED_IP_WORKFLOW_KEYWORD = 'ip';
const SCRIPTED_IP_WORKFLOW_DIR = 'vibe-demo';
const SCRIPTED_IP_WORKFLOW_FILE = 'index.html';
const SCRIPTED_IP_WORKFLOW_STYLE_FILE = 'styles.css';
const SCRIPTED_IP_WORKFLOW_SCRIPT_FILE = 'app.js';
const SCRIPTED_IP_WORKFLOW_README_FILE = 'README.md';
const SCRIPTED_IP_WORKFLOW_DATA_DIR = 'data';
const SCRIPTED_IP_WORKFLOW_PLAN_FILE = 'plan.json';
const SCRIPTED_IP_WORKFLOW_EXTERNAL_FIXTURES_ROOT = 'D:/vibe-demo/fixtures';
const SCRIPTED_IP_WORKFLOW_FIXTURES_DIR = 'fixtures';
const SCRIPTED_IP_WORKFLOW_FIXTURES_CURRENT_DIR = 'current';
const SCRIPTED_IP_WORKFLOW_FIXTURE_MANIFEST_FILE = 'manifest.json';
const SCRIPTED_IP_WORKFLOW_ASSETS_DIR = 'assets';
const SCRIPTED_IP_WORKFLOW_ASSET_NOTES_FILE = 'asset-notes.md';
const SCRIPTED_IP_TEMPLATE_RELATIVE_PATH = 'resources/chat-templates/line-art-ip-product.html';
const SCRIPTED_IP_WORKFLOW_THINK_DELAY = 4200;
const SCRIPTED_IP_WORKFLOW_STEP_DELAY = 3200;
const SCRIPTED_IP_WORKFLOW_SECTION_TOTAL_DELAY = 5000;
const SCRIPTED_IP_WORKFLOW_SECTION_UPDATES = 24;
const SCRIPTED_IP_CONFIRMATION_WORDS = ['可以', '继续', '开始', '开始做', '按这个来', '确认', '没问题', '就这样', '开始创建', '按这个计划开始'];
const SCRIPTED_IP_UI_FIX_WORDS = ['修复ui', '修复UI'];
const SCRIPTED_IP_IMAGE_FIX_COMMAND = '优化图片上传策略：自动压缩到长边 1536 以内，并控制在 4MB 内';
const SCRIPTED_IP_IMAGE_FIX_WORDS = [SCRIPTED_IP_IMAGE_FIX_COMMAND, '图片自动压缩到1536和4m以内', '凡事上传的图片都需要被你自动压缩到长边为1536以下，然后再压缩到4M以内'];
const SCRIPTED_IP_LAUNCHER_FILE = 'start-preview.bat';
const SCRIPTED_IP_PREVIEW_SERVER_FILE = 'preview_server.py';
const SCRIPTED_IP_LAUNCHER_SUGGESTION_WORDS = ['配置一键预览脚本', '创建一键预览脚本', '配置启动脚本', '创建启动脚本', '配置预览工具', '创建预览工具'];
const SCRIPTED_IP_FIXTURE_IP_IMAGE_FILES = ['ip-01.svg', 'ip-02.svg', 'ip-03.svg', 'ip-04.svg'] as const;
const SCRIPTED_IP_FIXTURE_FINAL_IMAGE_FILES = ['final-01.svg', 'final-02.svg', 'final-03.svg', 'final-04.svg', 'final-05.svg'] as const;

type ScriptedWorkflowPlanStep = 'scenario' | 'focus' | 'pace' | 'confirm';
type ScriptedWorkflowScenarioOption = 'brandProposal' | 'commerceConversion' | 'launchShowcase';
type ScriptedWorkflowFocusOption = 'ipFirst' | 'productFirst' | 'balanced';
type ScriptedWorkflowPaceOption = 'standard' | 'detailed' | 'cinematic';
type ScriptedWorkflowVersion = 'v1' | 'v2';

interface IScriptedWorkflowPlanSelections {
	scenario?: ScriptedWorkflowScenarioOption;
	focus?: ScriptedWorkflowFocusOption;
	pace?: ScriptedWorkflowPaceOption;
}

interface IScriptedWorkflowPlanOption<TValue extends string> {
	readonly value: TValue;
	readonly title: string;
	readonly message: string;
	readonly summary: string;
	readonly impact: string;
}

const SCRIPTED_IP_SCENARIO_OPTIONS: readonly IScriptedWorkflowPlanOption<ScriptedWorkflowScenarioOption>[] = [
	{
		value: 'brandProposal',
		title: '品牌提案型',
		message: '选择页面定位：品牌提案型',
		summary: '页面会更像品牌创意提案，强化整体故事感、视觉氛围和阶段说明。',
		impact: '结构上会更重顶部概念区、阶段说明和方案展示节奏。'
	},
	{
		value: 'commerceConversion',
		title: '电商转化型',
		message: '选择页面定位：电商转化型',
		summary: '页面会更强调产品卖点、主视觉落点和转化路径。',
		impact: '结构上会更重产品信息层次、卖点卡片和结果区的输出效率。'
	},
	{
		value: 'launchShowcase',
		title: '发布展示型',
		message: '选择页面定位：发布展示型',
		summary: '页面会更像成品发布与案例展示，强调完整流程和最终效果呈现。',
		impact: '结构上会更重多阶段串联、结果陈列和整页视觉完成度。'
	}
];

const SCRIPTED_IP_FOCUS_OPTIONS: readonly IScriptedWorkflowPlanOption<ScriptedWorkflowFocusOption>[] = [
	{
		value: 'ipFirst',
		title: 'IP 形象优先',
		message: '选择展示重心：IP 形象优先',
		summary: '页面会把线稿角色生成、IP 变体比较和唯一 IP 锁定放在更核心的位置。',
		impact: '模块分配上会放大 IP 构筑区，产品区会作为后续承接。'
	},
	{
		value: 'productFirst',
		title: '产品卖点优先',
		message: '选择展示重心：产品卖点优先',
		summary: '页面会先服务产品展示，再把 IP 用作包装和视觉加成。',
		impact: '模块分配上会更强调产品展示、卖点说明和终稿输出区。'
	},
	{
		value: 'balanced',
		title: 'IP 与产品平衡',
		message: '选择展示重心：IP 与产品平衡',
		summary: '页面会让 IP 形象与产品陈列并行推进，避免一侧过强。',
		impact: '模块分配会均衡上传区、IP 构筑区、海报方案区和终稿区。'
	}
];

const SCRIPTED_IP_PACE_OPTIONS: readonly IScriptedWorkflowPlanOption<ScriptedWorkflowPaceOption>[] = [
	{
		value: 'standard',
		title: '标准推进',
		message: '选择生成节奏：标准推进',
		summary: '执行时保持清晰、稳定的生成节奏，适合常规演示。',
		impact: '会保留明确的计划、检查和分段写入过程，但整体推进更利落。'
	},
	{
		value: 'detailed',
		title: '细节增强',
		message: '选择生成节奏：细节增强',
		summary: '执行时会加入更多模块拆解和说明，更像一轮认真 coding session。',
		impact: '会在写每个区块前增加更多检查、推敲和结果整理反馈。'
	},
	{
		value: 'cinematic',
		title: '演示感渐进生成',
		message: '选择生成节奏：演示感渐进生成',
		summary: '执行时会更重视呈现节奏、过程层次和最终效果的完成感。',
		impact: '整体推进会更注重展示感和过程完整度。'
	}
];

interface IScriptedWorkflowState {
	readonly workflow: 'ip';
	phase: 'planning' | 'awaitingConfirmation' | 'scoping' | 'preparingWorkspace' | 'draftingStructure' | 'creatingFile' | 'writingSections' | 'validating' | 'done';
	stage: number;
	targetDirectory: URI;
	targetFile: URI;
	planIssued: boolean;
	confirmationReceived: boolean;
	fileCreated: boolean;
	treeShown: boolean;
	writeCompleted: boolean;
	planStep: ScriptedWorkflowPlanStep;
	selections: IScriptedWorkflowPlanSelections;
	lastUserMessage: string;
	launcherConfirmationPending: boolean;
	launcherCreated: boolean;
	launcherFile: URI;
	workflowVersion: ScriptedWorkflowVersion;
	knownIssues: {
		uiOverflow: boolean;
		imageOversize: boolean;
	};
	fixRequests: {
		uiOverflow: boolean;
		imageCompression: boolean;
	};
	awaitingFixes: boolean;
	readyForSecondVersion: boolean;
}

interface IScriptedWorkflow {
	readonly kind: 'ip';
	readonly targetDirectory: URI;
	readonly targetFile: URI;
	readonly styleFile: URI;
	readonly scriptFile: URI;
	readonly readmeFile: URI;
	readonly dataDirectory: URI;
	readonly planFile: URI;
	readonly fixturesDirectory: URI;
	readonly currentFixturesDirectory: URI;
	readonly fixtureManifestFile: URI;
	readonly assetsDirectory: URI;
	readonly assetNotesFile: URI;
	readonly templateSource: URI;
}

interface IScriptedWorkflowTemplateSections {
	readonly shell: string;
	readonly inputSection: string;
	readonly buildSection: string;
	readonly layoutSection: string;
	readonly outputSection: string;
	readonly footer: string;
}

interface IScriptedWorkflowProjectFiles {
	readonly htmlSections: IScriptedWorkflowTemplateSections;
	readonly css: string;
	readonly js: string;
	readonly planJson: string;
	readonly readme: string;
	readonly fixtureManifestJson: string;
	readonly fixtureAssets: readonly { filename: string; content: string }[];
	readonly assetNotes: string;
}

export class SetupAgent extends Disposable implements IChatAgentImplementation {

	private readonly scriptedWorkflowStates = new ResourceMap<IScriptedWorkflowState>();

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
			metadata: { helpTextPrefix: SetupAgent.SETUP_NEEDED_MESSAGE },
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

	private static readonly SETUP_NEEDED_MESSAGE = new MarkdownString(localize('settingUpCopilotNeeded', "You need to set up GitHub Copilot and be signed in to use Chat."));
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

		if (
			this.context.state.entitlement === ChatEntitlement.Unknown &&
			!this.chatEntitlementService.anonymous
		) {
			if (!await this.handleScriptedWorkflowRequest(request, progress)) {
				progress({
					kind: 'markdownContent',
					content: this.workspaceTrustManagementService.isWorkspaceTrusted() ? SetupAgent.SETUP_NEEDED_MESSAGE : SetupAgent.TRUST_NEEDED_MESSAGE
				});
			}

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
				content: this.workspaceTrustManagementService.isWorkspaceTrusted() ? SetupAgent.SETUP_NEEDED_MESSAGE : SetupAgent.TRUST_NEEDED_MESSAGE
			});
		}

		return {};
	}

	async provideFollowups(request: IChatAgentRequest, _result: IChatAgentResult, _history: IChatAgentHistoryEntry[], _token: CancellationToken): Promise<IChatFollowup[]> {
		const state = this.scriptedWorkflowStates.get(request.sessionResource);
		if (!state || state.workflow !== 'ip') {
			return [];
		}

		if (state.phase !== 'planning' && state.phase !== 'awaitingConfirmation' && state.phase !== 'done') {
			return [];
		}

		const createFollowup = (title: string, message: string, tooltip: string): IChatFollowup => ({
			kind: 'reply',
			agentId: request.agentId,
			title,
			message,
			tooltip
		});

		if (state.planStep === 'scenario') {
			return SCRIPTED_IP_SCENARIO_OPTIONS.map(option => createFollowup(option.title, option.message, option.summary));
		}

		if (state.planStep === 'focus') {
			return SCRIPTED_IP_FOCUS_OPTIONS.map(option => createFollowup(option.title, option.message, option.summary));
		}

		if (state.planStep === 'pace') {
			return SCRIPTED_IP_PACE_OPTIONS.map(option => createFollowup(option.title, option.message, option.summary));
		}

		if (state.phase === 'done') {
			if (state.launcherConfirmationPending && !state.launcherCreated) {
				return [
					createFollowup('确认创建启动脚本', '确认创建启动脚本', '在 vibe-demo 目录中生成一键启动本地预览的 BAT。'),
					createFollowup('先不配置', '先不配置', '暂时跳过本地预览启动脚本。')
				];
			}

			if (!state.launcherCreated) {
				return [
					createFollowup('配置一键预览脚本', '配置一键预览脚本', '生成 start-preview.bat，一键启动 Python 本地服务并打开页面。'),
					createFollowup('继续优化页面', '继续优化页面', '继续补充页面动效、文案或结构。')
				];
			}

			return [
				createFollowup('继续优化页面', '继续优化页面', '继续补充页面动效、文案或结构。')
			];
		}

		return [
			createFollowup('按这个计划开始', '按这个计划开始', '确认当前 plan，开始进入页面创建流程。'),
			createFollowup('重选页面定位', '重选页面定位', '返回第一轮，重新选择页面定位。'),
			createFollowup('重选展示重心', '重选展示重心', '返回第二轮，重新选择展示重心。'),
			createFollowup('重选生成节奏', '重选生成节奏', '返回第三轮，重新选择生成节奏。')
		];
	}

	private async handleScriptedWorkflowRequest(request: IChatAgentRequest, progress: (part: IChatProgress) => void): Promise<boolean> {
		const sessionState = this.scriptedWorkflowStates.get(request.sessionResource);
		if (sessionState?.phase === 'done') {
			sessionState.lastUserMessage = request.message;

			if (sessionState.awaitingFixes && sessionState.workflowVersion === 'v1') {
				const needsUiFix = this.isScriptedWorkflowUiFixRequest(request.message);
				const needsImageFix = this.isScriptedWorkflowImageFixRequest(request.message);
				if (needsUiFix || needsImageFix) {
					if (needsUiFix) {
						sessionState.fixRequests.uiOverflow = true;
					}

					if (needsImageFix) {
						sessionState.fixRequests.imageCompression = true;
					}

					sessionState.readyForSecondVersion = sessionState.fixRequests.uiOverflow && sessionState.fixRequests.imageCompression;
					if (!sessionState.readyForSecondVersion) {
						progress({
							kind: 'markdownContent',
							content: new MarkdownString(
								sessionState.fixRequests.uiOverflow
									? '已记录这轮界面布局调整要求。我先把它并入修订清单，等上传策略那一项也确认后，再一起输出修正版。'
									: '已记录这轮图片预处理要求。我先把它并入修订清单，等界面布局那一项也确认后，再一起输出修正版。'
							)
						});
						return true;
					}

					sessionState.workflowVersion = 'v2';
					sessionState.knownIssues.uiOverflow = false;
					sessionState.knownIssues.imageOversize = false;
					sessionState.awaitingFixes = false;
					sessionState.readyForSecondVersion = false;
					sessionState.phase = 'scoping';
					sessionState.fileCreated = false;
					sessionState.treeShown = false;
					sessionState.writeCompleted = false;
					sessionState.launcherConfirmationPending = false;
					await this.runScriptedWorkflow(this.reviveScriptedWorkflow(sessionState.targetDirectory), request.sessionResource, request.message, progress);
					return true;
				}
			}

			if (sessionState.launcherConfirmationPending && this.isScriptedWorkflowLauncherConfirmation(request.message)) {
				await this.createScriptedWorkflowLauncher(sessionState, progress);
				return true;
			}

			if (sessionState.launcherConfirmationPending && this.isScriptedWorkflowLauncherSkip(request.message)) {
				sessionState.launcherConfirmationPending = false;
				progress({
					kind: 'markdownContent',
					content: new MarkdownString('可以，先保留当前页面文件。如果你后面需要，我再补 `start-preview.bat`。')
				});
				return true;
			}

			if (!sessionState.launcherCreated && this.isScriptedWorkflowLauncherSuggestion(request.message)) {
				sessionState.launcherConfirmationPending = true;
				progress({
					kind: 'progressMessage',
					content: new MarkdownString('正在整理本地预览启动方案。'),
					shimmer: true
				});
				await timeout(SCRIPTED_IP_WORKFLOW_STEP_DELAY);
				progress({
					kind: 'markdownContent',
					content: new MarkdownString([
						'下一步建议：给这个页面补一个本地预览入口，方便你直接查看效果。',
						'',
						'我会把预览工具放到当前输出目录里，后面你只需要双击启动即可。',
						'- 会先检查本地运行环境是否可用',
						'- 然后启动当前页面的本地预览',
						`- 并打开 \`http://127.0.0.1:5500/${SCRIPTED_IP_WORKFLOW_FILE}\``,
						'',
						'如果这个方向没问题，你确认后我就直接配置。'
					].join('\n'))
				});
				return true;
			}
		}

		if (sessionState && (sessionState.phase === 'planning' || sessionState.phase === 'awaitingConfirmation')) {
			sessionState.lastUserMessage = request.message;

			if (this.tryApplyScriptedWorkflowPlanSelection(sessionState, request.message)) {
				await this.runScriptedWorkflowPlan(this.reviveScriptedWorkflow(sessionState.targetDirectory), request.sessionResource, request.message, progress, true);
				return true;
			}

			if (sessionState.phase === 'awaitingConfirmation' && this.isScriptedWorkflowConfirmation(request.message)) {
				sessionState.phase = 'scoping';
				sessionState.confirmationReceived = true;
				await this.runScriptedWorkflow(this.reviveScriptedWorkflow(sessionState.targetDirectory), request.sessionResource, request.message, progress);
				return true;
			}

			await this.runScriptedWorkflowPlan(this.reviveScriptedWorkflow(sessionState.targetDirectory), request.sessionResource, request.message, progress, true);
			return true;
		}

		const scriptedWorkflow = this.getScriptedWorkflow(request.message);
		if (scriptedWorkflow) {
			await this.runScriptedWorkflowPlan(scriptedWorkflow, request.sessionResource, request.message, progress, false);
			return true;
		}

		if (this.isScriptedWorkflowRequest(request.message)) {
			progress({
				kind: 'warning',
				content: new MarkdownString(localize('customKeywordResponse.ip.noWorkspace', "当前没有打开工作区文件夹，无法创建目标页面文件。"))
			});
			return true;
		}

		return false;
	}

	private isScriptedWorkflowRequest(message: string): boolean {
		return message.toLowerCase().includes(SCRIPTED_IP_WORKFLOW_KEYWORD);
	}

	private isScriptedWorkflowConfirmation(message: string): boolean {
		const normalizedMessage = this.normalizeScriptedWorkflowMessage(message);
		return SCRIPTED_IP_CONFIRMATION_WORDS.some(word => normalizedMessage === word || normalizedMessage === word.toLowerCase());
	}

	private isScriptedWorkflowLauncherSuggestion(message: string): boolean {
		const normalizedMessage = this.normalizeScriptedWorkflowMessage(message);
		return SCRIPTED_IP_LAUNCHER_SUGGESTION_WORDS.some(word => normalizedMessage === this.normalizeScriptedWorkflowMessage(word));
	}

	private isScriptedWorkflowLauncherConfirmation(message: string): boolean {
		const normalizedMessage = this.normalizeScriptedWorkflowMessage(message);
		return normalizedMessage === this.normalizeScriptedWorkflowMessage('确认创建启动脚本') || this.isScriptedWorkflowConfirmation(message);
	}

	private isScriptedWorkflowLauncherSkip(message: string): boolean {
		const normalizedMessage = this.normalizeScriptedWorkflowMessage(message);
		return normalizedMessage === this.normalizeScriptedWorkflowMessage('先不配置') || normalizedMessage === this.normalizeScriptedWorkflowMessage('暂时不用');
	}

	private isScriptedWorkflowUiFixRequest(message: string): boolean {
		const normalizedMessage = this.normalizeScriptedWorkflowMessage(message);
		return normalizedMessage.includes('修复ui') || SCRIPTED_IP_UI_FIX_WORDS.some(word => normalizedMessage === this.normalizeScriptedWorkflowMessage(word));
	}

	private isScriptedWorkflowImageFixRequest(message: string): boolean {
		const normalizedMessage = this.normalizeScriptedWorkflowMessage(message);
		return normalizedMessage.includes('4mb') || SCRIPTED_IP_IMAGE_FIX_WORDS.some(word => normalizedMessage === this.normalizeScriptedWorkflowMessage(word));
	}

	private normalizeScriptedWorkflowMessage(message: string): string {
		return message.toLowerCase().replace(/[\s,，。.!！?？:：;；'"`~\-]+/g, '');
	}

	private tryApplyScriptedWorkflowPlanSelection(state: IScriptedWorkflowState, message: string): boolean {
		const normalizedMessage = this.normalizeScriptedWorkflowMessage(message);
		const applyOption = <TValue extends string>(
			options: readonly IScriptedWorkflowPlanOption<TValue>[],
			assign: (value: TValue) => void,
			nextStep: ScriptedWorkflowPlanStep
		): boolean => {
			const matchedOption = options.find(option => this.normalizeScriptedWorkflowMessage(option.message) === normalizedMessage || this.normalizeScriptedWorkflowMessage(option.title) === normalizedMessage);
			if (!matchedOption) {
				return false;
			}

			assign(matchedOption.value);
			state.planStep = nextStep;
			state.phase = nextStep === 'confirm' ? 'awaitingConfirmation' : 'planning';
			return true;
		};

		if (normalizedMessage === this.normalizeScriptedWorkflowMessage('重选页面定位')) {
			state.planStep = 'scenario';
			state.phase = 'planning';
			return true;
		}

		if (normalizedMessage === this.normalizeScriptedWorkflowMessage('重选展示重心')) {
			state.planStep = 'focus';
			state.phase = 'planning';
			return true;
		}

		if (normalizedMessage === this.normalizeScriptedWorkflowMessage('重选生成节奏')) {
			state.planStep = 'pace';
			state.phase = 'planning';
			return true;
		}

		switch (state.planStep) {
			case 'scenario':
				return applyOption(SCRIPTED_IP_SCENARIO_OPTIONS, value => state.selections.scenario = value, state.selections.focus ? (state.selections.pace ? 'confirm' : 'pace') : 'focus');
			case 'focus':
				return applyOption(SCRIPTED_IP_FOCUS_OPTIONS, value => state.selections.focus = value, state.selections.pace ? 'confirm' : 'pace');
			case 'pace':
				return applyOption(SCRIPTED_IP_PACE_OPTIONS, value => state.selections.pace = value, 'confirm');
			case 'confirm':
				return false;
		}
	}

	private getScriptedWorkflow(message: string): IScriptedWorkflow | undefined {
		if (!this.isScriptedWorkflowRequest(message)) {
			return undefined;
		}

		const workspaceFolder = this.workspaceContextService.getWorkspace().folders[0];
		if (!workspaceFolder) {
			return undefined;
		}

		const targetDirectory = URI.joinPath(workspaceFolder.uri, SCRIPTED_IP_WORKFLOW_DIR);
		const targetFile = URI.joinPath(targetDirectory, SCRIPTED_IP_WORKFLOW_FILE);
		const styleFile = URI.joinPath(targetDirectory, SCRIPTED_IP_WORKFLOW_STYLE_FILE);
		const scriptFile = URI.joinPath(targetDirectory, SCRIPTED_IP_WORKFLOW_SCRIPT_FILE);
		const readmeFile = URI.joinPath(targetDirectory, SCRIPTED_IP_WORKFLOW_README_FILE);
		const dataDirectory = URI.joinPath(targetDirectory, SCRIPTED_IP_WORKFLOW_DATA_DIR);
		const planFile = URI.joinPath(dataDirectory, SCRIPTED_IP_WORKFLOW_PLAN_FILE);
		const fixturesDirectory = URI.file(SCRIPTED_IP_WORKFLOW_EXTERNAL_FIXTURES_ROOT);
		const currentFixturesDirectory = URI.joinPath(fixturesDirectory, SCRIPTED_IP_WORKFLOW_FIXTURES_CURRENT_DIR);
		const fixtureManifestFile = URI.joinPath(currentFixturesDirectory, SCRIPTED_IP_WORKFLOW_FIXTURE_MANIFEST_FILE);
		const assetsDirectory = URI.joinPath(targetDirectory, SCRIPTED_IP_WORKFLOW_ASSETS_DIR);
		const assetNotesFile = URI.joinPath(assetsDirectory, SCRIPTED_IP_WORKFLOW_ASSET_NOTES_FILE);
		return {
			kind: 'ip',
			targetDirectory,
			targetFile,
			styleFile,
			scriptFile,
			readmeFile,
			dataDirectory,
			planFile,
			fixturesDirectory,
			currentFixturesDirectory,
			fixtureManifestFile,
			assetsDirectory,
			assetNotesFile,
			templateSource: this.getScriptedWorkflowTemplateSource()
		};
	}

	private reviveScriptedWorkflow(targetDirectory: URI): IScriptedWorkflow {
		return {
			kind: 'ip',
			targetDirectory,
			targetFile: URI.joinPath(targetDirectory, SCRIPTED_IP_WORKFLOW_FILE),
			styleFile: URI.joinPath(targetDirectory, SCRIPTED_IP_WORKFLOW_STYLE_FILE),
			scriptFile: URI.joinPath(targetDirectory, SCRIPTED_IP_WORKFLOW_SCRIPT_FILE),
			readmeFile: URI.joinPath(targetDirectory, SCRIPTED_IP_WORKFLOW_README_FILE),
			dataDirectory: URI.joinPath(targetDirectory, SCRIPTED_IP_WORKFLOW_DATA_DIR),
			planFile: URI.joinPath(URI.joinPath(targetDirectory, SCRIPTED_IP_WORKFLOW_DATA_DIR), SCRIPTED_IP_WORKFLOW_PLAN_FILE),
			fixturesDirectory: URI.file(SCRIPTED_IP_WORKFLOW_EXTERNAL_FIXTURES_ROOT),
			currentFixturesDirectory: URI.joinPath(URI.file(SCRIPTED_IP_WORKFLOW_EXTERNAL_FIXTURES_ROOT), SCRIPTED_IP_WORKFLOW_FIXTURES_CURRENT_DIR),
			fixtureManifestFile: URI.joinPath(URI.joinPath(URI.file(SCRIPTED_IP_WORKFLOW_EXTERNAL_FIXTURES_ROOT), SCRIPTED_IP_WORKFLOW_FIXTURES_CURRENT_DIR), SCRIPTED_IP_WORKFLOW_FIXTURE_MANIFEST_FILE),
			assetsDirectory: URI.joinPath(targetDirectory, SCRIPTED_IP_WORKFLOW_ASSETS_DIR),
			assetNotesFile: URI.joinPath(URI.joinPath(targetDirectory, SCRIPTED_IP_WORKFLOW_ASSETS_DIR), SCRIPTED_IP_WORKFLOW_ASSET_NOTES_FILE),
			templateSource: this.getScriptedWorkflowTemplateSource()
		};
	}

	private getScriptedWorkflowTemplateSource(): URI {
		const appRoot = (this.environmentService as IWorkbenchEnvironmentService & { appRoot: string }).appRoot;
		return URI.file(join(appRoot, ...SCRIPTED_IP_TEMPLATE_RELATIVE_PATH.split('/')));
	}

	private getScriptedWorkflowPlanStepPrompt(planStep: ScriptedWorkflowPlanStep): string {
		switch (planStep) {
			case 'scenario':
				return '先确认页面定位，我会据此决定整页叙事方式、模块主次和视觉节奏。';
			case 'focus':
				return '页面定位已经确定，下一步需要确认展示重心，用来分配 IP 与产品模块的权重。';
			case 'pace':
				return '页面定位和展示重心已经确定，最后再确认这次生成时的节奏风格。';
			case 'confirm':
				return '三轮选项已经齐全，当前计划可以直接进入执行；如果还想调整，也可以先返回某一轮重选。';
		}
	}

	private getScriptedWorkflowSelectedOption<TValue extends string>(options: readonly IScriptedWorkflowPlanOption<TValue>[], value: TValue | undefined): IScriptedWorkflowPlanOption<TValue> | undefined {
		return value ? options.find(option => option.value === value) : undefined;
	}

	private async runScriptedWorkflowPlan(workflow: IScriptedWorkflow, sessionResource: URI, message: string, progress: (part: IChatProgress) => void, isRevision: boolean): Promise<void> {
		if (!this.workspaceTrustManagementService.isWorkspaceTrusted()) {
			progress({
				kind: 'markdownContent',
				content: SetupAgent.TRUST_NEEDED_MESSAGE
			});
			return;
		}

		const workspaceFolder = this.workspaceContextService.getWorkspace().folders[0];
		if (!workspaceFolder) {
			progress({
				kind: 'warning',
				content: new MarkdownString(localize('customKeywordResponse.ip.noWorkspace', "当前没有打开工作区文件夹，无法创建目标页面文件。"))
			});
			return;
		}

		const existingState = this.scriptedWorkflowStates.get(sessionResource);
		const state: IScriptedWorkflowState = existingState ?? {
			workflow: workflow.kind,
			phase: 'planning',
			stage: 0,
			targetDirectory: workflow.targetDirectory,
			targetFile: workflow.targetFile,
			planIssued: false,
			confirmationReceived: false,
			fileCreated: false,
			treeShown: false,
			writeCompleted: false,
			planStep: 'scenario',
			selections: {},
			lastUserMessage: message,
			launcherConfirmationPending: false,
			launcherCreated: false,
			launcherFile: URI.joinPath(workflow.targetDirectory, SCRIPTED_IP_LAUNCHER_FILE),
			workflowVersion: 'v1',
			knownIssues: {
				uiOverflow: true,
				imageOversize: true
			},
			fixRequests: {
				uiOverflow: false,
				imageCompression: false
			},
			awaitingFixes: false,
			readyForSecondVersion: false
		};
		state.targetDirectory = workflow.targetDirectory;
		state.targetFile = workflow.targetFile;
		state.launcherFile = URI.joinPath(workflow.targetDirectory, SCRIPTED_IP_LAUNCHER_FILE);
		state.lastUserMessage = message;
		this.scriptedWorkflowStates.set(sessionResource, state);

		const selectedScenario = this.getScriptedWorkflowSelectedOption(SCRIPTED_IP_SCENARIO_OPTIONS, state.selections.scenario);
		const selectedFocus = this.getScriptedWorkflowSelectedOption(SCRIPTED_IP_FOCUS_OPTIONS, state.selections.focus);
		const selectedPace = this.getScriptedWorkflowSelectedOption(SCRIPTED_IP_PACE_OPTIONS, state.selections.pace);
		const unresolvedSelections = [
			!selectedScenario ? '页面定位' : undefined,
			!selectedFocus ? '展示重心' : undefined,
			!selectedPace ? '生成节奏' : undefined
		].filter((value): value is string => Boolean(value));

		progress({
			kind: 'progressMessage',
			content: new MarkdownString(isRevision ? '正在根据你刚才的选择重整实现计划。' : '正在分析需求并整理实现方案。'),
			shimmer: true
		});
		await timeout(SCRIPTED_IP_WORKFLOW_THINK_DELAY);

		progress({
			kind: 'markdownContent',
			content: new MarkdownString([
				isRevision ? '我已经根据你刚才的选择更新了这轮 coding plan。' : '我理解你的目标是生成一个“线稿 IP + 产品”页面，我先不急着写代码，先把 plan 做完整，再进入实际创建。',
				'',
				'需求确认：',
				'- 页面主体是一套围绕“线稿 IP + 产品”工作流构建的可交互 HTML 页面。',
				'- 页面需要覆盖从素材上传、IP 构筑、海报方案选择到终稿输出的完整流程。',
				'- 输出结果会落到工作区里的 `vibe-demo/index.html`。',
				`- 当前会话会按照“${message.trim() || 'IP 页面需求'}”这个方向继续收敛 plan。`,
				'',
				'当前已确认的 plan 选项：',
				`- 页面定位：${selectedScenario?.title ?? '待选择'}`,
				selectedScenario ? `  ${selectedScenario.summary}` : '  这一步会决定页面是更偏品牌提案、电商转化，还是发布展示。',
				`- 展示重心：${selectedFocus?.title ?? '待选择'}`,
				selectedFocus ? `  ${selectedFocus.summary}` : '  这一步会决定 IP 形象和产品卖点的权重分配。',
				`- 生成节奏：${selectedPace?.title ?? '待选择'}`,
				selectedPace ? `  ${selectedPace.summary}` : '  这一步会决定执行时是标准推进、细节增强，还是演示感更强的渐进生成。'
			].join('\n'))
		});
		await timeout(SCRIPTED_IP_WORKFLOW_STEP_DELAY);

		progress({
			kind: 'markdownContent',
			content: new MarkdownString([
				'完整 coding plan：',
				'1. 先做 Planning / Reasoning，明确页面目标、模块拆分、阶段顺序和输出路径。',
				'2. 然后进入 Scoping，确认本次页面产出的范围、文件组织和主要模块边界。',
				'3. 接着进入 Drafting，先定页面骨架、状态区、四阶段流程、上传区、IP 构筑区、海报方案区和终稿区的模块顺序。',
				'4. 执行时会先完成整体框架，再逐步完善上传区、IP 构筑区、海报方案区和终稿区。',
				'5. 页面内容会按模块推进，保证结构、文案和视觉信息是连贯收束的。',
				'6. 生成过程中会持续补足关键区块，而不是只给一个粗糙初稿。',
				'7. 最后再做一轮结构检查、结果整理和输出确认，确保页面可继续完善。'
			].join('\n'))
		});
		await timeout(SCRIPTED_IP_WORKFLOW_STEP_DELAY);

		progress({
			kind: 'markdownContent',
			content: new MarkdownString([
				'页面结构规划：',
				'- 顶部状态区：展示当前阶段、已锁定 IP、已锁定海报方案。',
				'- 四阶段流程区：录入阶段、IP 构筑、布局设计、成品精修。',
				'- 上传区：素材上传、配置输入、生成入口。',
				'- IP 构筑区：4 个候选 IP 方案与唯一 IP 确认动作。',
				'- 海报方案区：4 个海报方案、提示词编辑、重生成入口。',
				'- 终稿输出区：5 个终稿卡片、导出说明与最终导出动作。',
				'',
				selectedScenario ? `页面定位决定：${selectedScenario.impact}` : '页面定位暂未确定，所以我先保留三种路径的弹性空间。',
				selectedFocus ? `展示重心决定：${selectedFocus.impact}` : '展示重心暂未确定，所以我先按均衡骨架做 plan 收敛。',
				selectedPace ? `生成节奏决定：${selectedPace.impact}` : '生成节奏暂未确定，所以执行细节先保持可调整状态。'
			].join('\n'))
		});
		await timeout(SCRIPTED_IP_WORKFLOW_STEP_DELAY);

		progress({
			kind: 'markdownContent',
			content: new MarkdownString([
				'当前这轮 plan 的下一步：',
				this.getScriptedWorkflowPlanStepPrompt(state.planStep),
				'',
				state.planStep === 'confirm'
					? '- 你已经完成了所有关键选项，我会在你确认后才真正开始创建文件和输出代码。'
					: `- 还缺少的选项：${unresolvedSelections.join('、')}。`,
				'- 你可以直接点击下方选项继续收敛 plan，不需要手动重写整段需求。',
				'- 在你确认之前，我会先把方向收敛清楚，避免页面范围和结构反复改动。'
			].join('\n'))
		});
		await timeout(SCRIPTED_IP_WORKFLOW_STEP_DELAY);

		progress({
			kind: 'markdownContent',
			content: new MarkdownString(
				state.planStep === 'confirm'
					? '当前 plan 已经收敛完成。你可以直接点下方“按这个计划开始”，或者先返回某一轮重选。'
					: '先把这轮 plan 的选项补齐，等你完成选择后，我再进入最终确认。'
			)
		});

		state.phase = state.planStep === 'confirm' ? 'awaitingConfirmation' : 'planning';
		state.planIssued = true;
		this.scriptedWorkflowStates.set(sessionResource, state);
	}

	private async runScriptedWorkflow(workflow: IScriptedWorkflow, sessionResource: URI, confirmationMessage: string, progress: (part: IChatProgress) => void): Promise<void> {
		if (!this.workspaceTrustManagementService.isWorkspaceTrusted()) {
			progress({
				kind: 'markdownContent',
				content: SetupAgent.TRUST_NEEDED_MESSAGE
			});
			return;
		}

		const workspaceFolder = this.workspaceContextService.getWorkspace().folders[0];
		if (!workspaceFolder) {
			progress({
				kind: 'warning',
				content: new MarkdownString(localize('customKeywordResponse.ip.noWorkspace', "当前没有打开工作区文件夹，无法创建目标页面文件。"))
			});
			return;
		}

		const state = this.scriptedWorkflowStates.get(sessionResource) ?? {
			workflow: workflow.kind,
			phase: 'scoping',
			stage: 0,
			targetDirectory: workflow.targetDirectory,
			targetFile: workflow.targetFile,
			planIssued: true,
			confirmationReceived: true,
			fileCreated: false,
			treeShown: false,
			writeCompleted: false,
			planStep: 'confirm',
			selections: {},
			lastUserMessage: confirmationMessage,
			launcherConfirmationPending: false,
			launcherCreated: false,
			launcherFile: URI.joinPath(workflow.targetDirectory, SCRIPTED_IP_LAUNCHER_FILE),
			workflowVersion: 'v1',
			knownIssues: {
				uiOverflow: true,
				imageOversize: true
			},
			fixRequests: {
				uiOverflow: false,
				imageCompression: false
			},
			awaitingFixes: false,
			readyForSecondVersion: false
		};
		this.scriptedWorkflowStates.set(sessionResource, state);
		state.phase = 'scoping';
		state.confirmationReceived = true;
		state.lastUserMessage = confirmationMessage;
		state.launcherFile = URI.joinPath(workflow.targetDirectory, SCRIPTED_IP_LAUNCHER_FILE);
		state.treeShown = false;
		state.writeCompleted = false;

		progress({
			kind: 'progressMessage',
			content: new MarkdownString(
				state.workflowVersion === 'v2'
					? localize('customKeywordResponse.ip.executionRevisionStart', "已收到这轮修订反馈，开始整理修正版页面。")
					: localize('customKeywordResponse.ip.executionStart', "已收到确认“{0}”，开始进入页面创建阶段。", confirmationMessage.trim() || localize('customKeywordResponse.ip.confirmationFallback', "继续"))
			),
			shimmer: true
		});
		await timeout(SCRIPTED_IP_WORKFLOW_THINK_DELAY);
		state.stage = 1;
		state.phase = 'scoping';

		progress({
			kind: 'progressMessage',
			content: new MarkdownString(localize('customKeywordResponse.ip.scopingWorkspace', "正在检查工作区结构并确认输出范围。")),
			shimmer: true
		});
		await timeout(SCRIPTED_IP_WORKFLOW_STEP_DELAY);

		progress({
			kind: 'progressMessage',
			content: new MarkdownString(localize('customKeywordResponse.ip.scopingOutput', "正在确认目标输出路径和页面模块拆分。")),
			shimmer: true
		});
		await timeout(SCRIPTED_IP_WORKFLOW_STEP_DELAY);

		progress({
			kind: 'progressMessage',
			content: new MarkdownString(localize('customKeywordResponse.ip.scopingReasoning', "正在整理页面骨架、阶段流程和主要功能区。")),
			shimmer: true
		});
		await timeout(SCRIPTED_IP_WORKFLOW_STEP_DELAY);

		let templateContent: string;
		let projectFiles: IScriptedWorkflowProjectFiles;
		try {
			templateContent = await this.readFileContent(workflow.templateSource);
			projectFiles = this.createScriptedWorkflowProjectFiles(templateContent, state.selections, state.workflowVersion);
		} catch (error) {
			this.logService.error('[chat setup] Failed to read scripted template.', error);
			progress({
				kind: 'warning',
				content: new MarkdownString(localize('customKeywordResponse.ip.templateReadFailed', "无法读取页面源内容，已停止当前生成流程。"))
			});
			return;
		}
		state.phase = 'preparingWorkspace';

		if (!await this.fileService.exists(workflow.targetDirectory)) {
			progress({
				kind: 'progressMessage',
				content: new MarkdownString(localize('customKeywordResponse.ip.creatingDirectory', "正在准备输出目录。")),
				shimmer: true
			});
			await timeout(SCRIPTED_IP_WORKFLOW_STEP_DELAY);
			await this.fileService.createFolder(workflow.targetDirectory);
		} else {
			progress({
				kind: 'progressMessage',
				content: new MarkdownString(localize('customKeywordResponse.ip.reusingDirectory', "检测到输出目录已存在，正在确认目录结构。")),
				shimmer: true
			});
			await timeout(SCRIPTED_IP_WORKFLOW_STEP_DELAY);
		}

		if (!await this.fileService.exists(workflow.dataDirectory)) {
			await this.fileService.createFolder(workflow.dataDirectory);
		}

		if (!await this.fileService.exists(workflow.fixturesDirectory)) {
			await this.fileService.createFolder(workflow.fixturesDirectory);
		}

		if (!await this.fileService.exists(workflow.currentFixturesDirectory)) {
			await this.fileService.createFolder(workflow.currentFixturesDirectory);
		}

		if (!await this.fileService.exists(workflow.assetsDirectory)) {
			await this.fileService.createFolder(workflow.assetsDirectory);
		}

		progress({
			kind: 'progressMessage',
			content: new MarkdownString(localize('customKeywordResponse.ip.namingFile', "正在确认页面结构和输出文件组织。")),
			shimmer: true
		});
		await timeout(SCRIPTED_IP_WORKFLOW_STEP_DELAY);

		const fileExists = await this.fileService.exists(workflow.targetFile);
		const styleFileExists = await this.fileService.exists(workflow.styleFile);
		const scriptFileExists = await this.fileService.exists(workflow.scriptFile);
		const planFileExists = await this.fileService.exists(workflow.planFile);
		const readmeFileExists = await this.fileService.exists(workflow.readmeFile);
		const fixtureManifestFileExists = await this.fileService.exists(workflow.fixtureManifestFile);
		const assetNotesFileExists = await this.fileService.exists(workflow.assetNotesFile);
		const useRevisionPatch = state.workflowVersion === 'v2' && fileExists && styleFileExists && scriptFileExists;
		state.phase = 'draftingStructure';
		progress({
			kind: 'progressMessage',
			content: new MarkdownString(localize('customKeywordResponse.ip.draftingStructure', "正在确定页面骨架、样式层和交互层的组织方式。")),
			shimmer: true
		});
		await timeout(SCRIPTED_IP_WORKFLOW_STEP_DELAY);

		progress({
			kind: 'progressMessage',
			content: new MarkdownString(localize('customKeywordResponse.ip.draftingLayout', "正在整理核心页面、样式、交互脚本和页面配置。")),
			shimmer: true
		});
		await timeout(SCRIPTED_IP_WORKFLOW_STEP_DELAY);

		const needsRewrite = !await this.areScriptedWorkflowProjectFilesUpToDate(workflow, projectFiles);
		state.phase = 'creatingFile';

		progress({
			kind: 'progressMessage',
			content: new MarkdownString(localize(
				fileExists ? 'customKeywordResponse.ip.openingFile' : 'customKeywordResponse.ip.creatingFile',
				fileExists ? "正在整理输出文件并准备继续完善。" : "正在创建页面项目文件。"
			)),
			shimmer: true
		});
		await timeout(SCRIPTED_IP_WORKFLOW_STEP_DELAY);

		const newlyCreatedResources: URI[] = [];
		const ensureTextFile = async (resource: URI, exists: boolean) => {
			if (!exists) {
				await this.fileService.createFile(resource, VSBuffer.fromString(''));
				newlyCreatedResources.push(resource);
				return;
			}

			if (needsRewrite && !useRevisionPatch) {
				await this.fileService.writeFile(resource, VSBuffer.fromString(''));
			}
		};

		await ensureTextFile(workflow.targetFile, fileExists);
		await ensureTextFile(workflow.styleFile, styleFileExists);
		await ensureTextFile(workflow.scriptFile, scriptFileExists);
		await ensureTextFile(workflow.planFile, planFileExists);
		await ensureTextFile(workflow.readmeFile, readmeFileExists);
		if (!fixtureManifestFileExists) {
			await this.fileService.createFile(workflow.fixtureManifestFile, VSBuffer.fromString(projectFiles.fixtureManifestJson));
			newlyCreatedResources.push(workflow.fixtureManifestFile);
		}
		for (const fixtureAsset of projectFiles.fixtureAssets) {
			const fixtureAssetFile = URI.joinPath(workflow.currentFixturesDirectory, fixtureAsset.filename);
			if (!await this.fileService.exists(fixtureAssetFile)) {
				await this.fileService.createFile(fixtureAssetFile, VSBuffer.fromString(fixtureAsset.content));
				newlyCreatedResources.push(fixtureAssetFile);
			}
		}
		await ensureTextFile(workflow.assetNotesFile, assetNotesFileExists);

		await this.openScriptedWorkflowEditor(workflow.targetFile);
		state.fileCreated = !fileExists;

		if (newlyCreatedResources.length) {
			progress({
				kind: 'workspaceEdit',
				edits: newlyCreatedResources.map(newResource => ({ newResource }))
			});
		}

		if (!state.treeShown) {
			progress({
				kind: 'treeData',
				treeData: this.createScriptedWorkflowTreeData(workflow, state.launcherCreated ? state.launcherFile : undefined)
			});
			state.treeShown = true;
		}
		await timeout(SCRIPTED_IP_WORKFLOW_STEP_DELAY);

		if (needsRewrite) {
			state.stage = 2;
			state.phase = 'writingSections';
			if (useRevisionPatch) {
				await this.applyScriptedWorkflowRevisionPatch(workflow, projectFiles, progress);
			} else {
				await this.writeScriptedWorkflowProjectFiles(workflow, projectFiles, progress);
			}
			state.writeCompleted = true;
		} else {
			progress({
				kind: 'markdownContent',
				content: new MarkdownString(localize('customKeywordResponse.ip.reuse', "当前页面目录已符合本次目标，已保留现有实现。"))
			});
			await timeout(SCRIPTED_IP_WORKFLOW_STEP_DELAY);
		}

		state.phase = 'validating';
		progress({
			kind: 'progressMessage',
			content: new MarkdownString(localize('customKeywordResponse.ip.validating', "正在检查页面结构与最终输出状态。")),
			shimmer: true
		});
		await timeout(SCRIPTED_IP_WORKFLOW_STEP_DELAY);

		progress({
			kind: 'progressMessage',
			content: new MarkdownString(localize('customKeywordResponse.ip.finalizing', "正在整理生成结果。")),
			shimmer: true
		});
		await timeout(SCRIPTED_IP_WORKFLOW_STEP_DELAY);

		state.stage = 3;
		state.phase = 'done';
		state.launcherConfirmationPending = state.workflowVersion === 'v1' && !state.launcherCreated;
		state.awaitingFixes = state.workflowVersion === 'v1';
		state.readyForSecondVersion = false;
		progress({
			kind: 'markdownContent',
			content: new MarkdownString(localize(
				state.workflowVersion === 'v2' ? 'customKeywordResponse.ip.doneRevision' : 'customKeywordResponse.ip.done',
				(state.workflowVersion === 'v2'
					? [
						state.fileCreated ? "`vibe-demo` 页面目录已整理为当前修订版。" : "`vibe-demo` 页面目录已根据反馈完成修订。",
						"",
						"- 当前入口、样式层、交互逻辑和配置文件已经同步更新。",
						`- 页面入口：\`${SCRIPTED_IP_WORKFLOW_DIR}/${SCRIPTED_IP_WORKFLOW_FILE}\``,
						`- 配套文件：\`${SCRIPTED_IP_WORKFLOW_STYLE_FILE}\`、\`${SCRIPTED_IP_WORKFLOW_SCRIPT_FILE}\`、\`${SCRIPTED_IP_WORKFLOW_DATA_DIR}/${SCRIPTED_IP_WORKFLOW_PLAN_FILE}\``,
						"- 这版已经把界面整理和上传处理策略一并纳入当前实现。",
						"",
						"如果你后面还要，我可以继续补本地预览入口，或者再把交互细节往前推进一轮。"
					]
					: [
						state.fileCreated ? "`vibe-demo` 页面目录已创建完成。" : "`vibe-demo` 页面目录已更新完成。",
						"",
						"- 页面主体、样式层、交互逻辑和基础配置已经整理完成。",
						`- 当前入口文件：\`${SCRIPTED_IP_WORKFLOW_DIR}/${SCRIPTED_IP_WORKFLOW_FILE}\``,
						`- 配套文件：\`${SCRIPTED_IP_WORKFLOW_STYLE_FILE}\`、\`${SCRIPTED_IP_WORKFLOW_SCRIPT_FILE}\`、\`${SCRIPTED_IP_WORKFLOW_DATA_DIR}/${SCRIPTED_IP_WORKFLOW_PLAN_FILE}\``,
						"- 建议先补本地预览入口，方便直接演示当前页面效果。",
						"",
						"如果你确认，我下一步先把 `start-preview.bat` 配好；后面再根据界面反馈和上传策略要求继续修订。"
					]).join('\n')
			))
		});
	}

	private async createScriptedWorkflowLauncher(state: IScriptedWorkflowState, progress: (part: IChatProgress) => void): Promise<void> {
		state.launcherConfirmationPending = false;

		progress({
			kind: 'progressMessage',
			content: new MarkdownString('正在配置本地预览入口。'),
			shimmer: true
		});
		await timeout(SCRIPTED_IP_WORKFLOW_STEP_DELAY);

		const previewServerContent = [
			'from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler',
			'from pathlib import Path',
			'from urllib.parse import unquote, urlparse',
			'import posixpath',
			'',
			'PORT = 5500',
			'EXTERNAL_FIXTURES_ROOT = Path(r"D:\\vibe-demo\\fixtures").resolve()',
			'EXTERNAL_PREFIX = "/external-fixtures/"',
			'',
			'class PreviewRequestHandler(SimpleHTTPRequestHandler):',
			'    def translate_path(self, path: str) -> str:',
			'        request_path = posixpath.normpath(unquote(urlparse(path).path))',
			'        if request_path.startswith(EXTERNAL_PREFIX):',
			'            relative_path = request_path[len(EXTERNAL_PREFIX):].lstrip("/")',
			'            candidate = (EXTERNAL_FIXTURES_ROOT / relative_path).resolve()',
			'            try:',
			'                candidate.relative_to(EXTERNAL_FIXTURES_ROOT)',
			'            except ValueError:',
			'                return str(EXTERNAL_FIXTURES_ROOT / "__not_found__")',
			'            return str(candidate)',
			'        return super().translate_path(path)',
			'',
			'def main() -> None:',
			'    server = ThreadingHTTPServer(("127.0.0.1", PORT), PreviewRequestHandler)',
			'    print(f"Starting preview server on http://127.0.0.1:{PORT} ...")',
			'    print(f"Serving external fixtures from {EXTERNAL_FIXTURES_ROOT}")',
			'    server.serve_forever()',
			'',
			'if __name__ == "__main__":',
			'    main()'
		].join('\r\n');

		const launcherContent = [
			'@echo off',
			'setlocal',
			'cd /d "%~dp0"',
			'where python >nul 2>nul',
			'if errorlevel 1 (',
			'  echo Python 未安装或未加入 PATH，无法启动本地预览。',
			'  echo 请先安装 Python，或将 python 命令加入系统 PATH。',
			'  pause',
			'  exit /b 1',
			')',
			'echo Starting preview server on http://127.0.0.1:5500 ...',
			'start "" cmd /k "cd /d ""%~dp0"" && python preview_server.py"',
			'timeout /t 2 >nul',
			'start "" "http://127.0.0.1:5500/"',
			'endlocal'
		].join('\r\n');

		const previewServerFile = URI.joinPath(state.targetDirectory, SCRIPTED_IP_PREVIEW_SERVER_FILE);
		await this.fileService.writeFile(previewServerFile, VSBuffer.fromString(previewServerContent));
		await this.fileService.writeFile(state.launcherFile, VSBuffer.fromString(launcherContent));
		state.launcherCreated = true;

		progress({
			kind: 'workspaceEdit',
			edits: [{ newResource: previewServerFile }, { newResource: state.launcherFile }]
		});
		progress({
			kind: 'treeData',
			treeData: this.createScriptedWorkflowTreeData(this.reviveScriptedWorkflow(state.targetDirectory), state.launcherFile)
		});
		await timeout(SCRIPTED_IP_WORKFLOW_STEP_DELAY);

		progress({
			kind: 'markdownContent',
			content: new MarkdownString([
				'本地预览入口已经配置完成。',
				'',
				'- 预览脚本：`vibe-demo/start-preview.bat`',
				'- 服务脚本：`vibe-demo/preview_server.py`',
				'- 使用方式：双击后即可启动本地预览并打开当前页面',
				'- 页面地址：`http://127.0.0.1:5500/`',
				'- 外部结果目录：`D:/vibe-demo/fixtures/current/` 会映射到 `/external-fixtures/current/`',
				'',
				'后面如果你还要，我可以继续把预览入口和页面功能联动得更完整。'
			].join('\n'))
		});
	}

	private async readFileContent(resource: URI): Promise<string> {
		const content = await this.fileService.readFile(resource);
		return content.value.toString();
	}

	private async tryReadFileContent(resource: URI): Promise<string | undefined> {
		if (!await this.fileService.exists(resource)) {
			return undefined;
		}

		return this.readFileContent(resource);
	}

	private createScriptedWorkflowProjectFiles(templateContent: string, selections: IScriptedWorkflowPlanSelections, workflowVersion: ScriptedWorkflowVersion): IScriptedWorkflowProjectFiles {
		const sourceSections = this.splitScriptedWorkflowTemplate(templateContent);
		const css = this.createScriptedWorkflowCss(this.extractScriptedWorkflowStyle(sourceSections.shell), workflowVersion);
		const js = this.createScriptedWorkflowJs(this.extractScriptedWorkflowScript(sourceSections.footer), workflowVersion);
		const fixtureManifestJson = this.createScriptedWorkflowFixtureManifest();
		const fixtureAssets = this.createScriptedWorkflowFixtureAssets();
		const htmlSections: IScriptedWorkflowTemplateSections = {
			shell: this.rewriteScriptedWorkflowShell(sourceSections.shell),
			inputSection: this.createScriptedWorkflowInputSection(sourceSections.inputSection, workflowVersion),
			buildSection: sourceSections.buildSection,
			layoutSection: sourceSections.layoutSection,
			outputSection: sourceSections.outputSection,
			footer: '\n  <script src="./app.js?v=20260410-preview-fix"></script>\n</body>\n</html>\n'
		};

		const scenario = this.getScriptedWorkflowSelectedOption(SCRIPTED_IP_SCENARIO_OPTIONS, selections.scenario);
		const focus = this.getScriptedWorkflowSelectedOption(SCRIPTED_IP_FOCUS_OPTIONS, selections.focus);
		const pace = this.getScriptedWorkflowSelectedOption(SCRIPTED_IP_PACE_OPTIONS, selections.pace);

		return {
			htmlSections,
			css,
			js,
			planJson: JSON.stringify({
				project: 'vibe-demo',
				output: 'vibe-demo',
				entry: 'index.html',
				version: workflowVersion,
				selections: {
					scenario: scenario?.title ?? '未指定',
					focus: focus?.title ?? '未指定',
					pace: pace?.title ?? '未指定'
				},
				revision: workflowVersion === 'v1'
					? {
						status: 'draft',
						nextStep: 'Collect UI and upload strategy feedback before the next revision.'
					}
					: {
						status: 'revised',
						appliedUpdates: [
							'Upload panel layout refinement',
							'Automatic image preprocessing before generation'
						]
					},
				preview: {
					entry: 'index.html',
					url: 'http://127.0.0.1:5500/'
				}
			}, null, 2) + '\n',
			readme: [
				'# Vibe Demo',
				'',
				'This directory contains a lightweight front-end demo generated for the line-art IP + product workflow.',
				'',
				'## Files',
				'- `index.html`: page entry',
				'- `styles.css`: visual system and layout',
				'- `app.js`: interaction logic',
				'- `data/plan.json`: generation plan snapshot',
				'- `D:/vibe-demo/fixtures/current/manifest.json`: presentation result manifest',
				'- `assets/asset-notes.md`: asset placement notes',
				'',
				`## Revision`,
				`- Current revision: ${workflowVersion.toUpperCase()}`,
				'',
				'## Preview',
				'- Double-click `start-preview.bat` after it is created, or serve this directory with a local static server.'
			].join('\n') + '\n',
			fixtureManifestJson,
			fixtureAssets,
			assetNotes: [
				'# Assets',
				'',
				'- Put reference IP images here.',
				'- Put product packshots or transparent PNG assets here.',
				'- Keep exported poster drafts here if you want to continue iterating.',
				'- Edit `D:/vibe-demo/fixtures/current/manifest.json` and replace the matching image files when you want to swap the presentation results.'
			].join('\n') + '\n'
		};
	}

	private createScriptedWorkflowFixtureManifest(): string {
		return JSON.stringify({
			ip: [
				{ id: 'IP 01', title: '线稿守护者', description: '保留线稿轮廓与角色识别点，强调展台首屏辨识度。', image: SCRIPTED_IP_FIXTURE_IP_IMAGE_FILES[0] },
				{ id: 'IP 02', title: '陈列引导型', description: '角色姿态更适合带出产品陈列区与卖点说明。', image: SCRIPTED_IP_FIXTURE_IP_IMAGE_FILES[1] },
				{ id: 'IP 03', title: '品牌故事型', description: '更突出角色气质与品牌叙事氛围，适合提案展示。', image: SCRIPTED_IP_FIXTURE_IP_IMAGE_FILES[2] },
				{ id: 'IP 04', title: '发布展示型', description: '角色完成度更高，便于直接进入海报与终稿阶段。', image: SCRIPTED_IP_FIXTURE_IP_IMAGE_FILES[3] }
			],
			poster: [
				{ id: '方案 01', title: '主视觉聚焦', description: '以产品英雄位为核心，角色作为品牌记忆点托举主卖点。', prompt: '品牌商业海报，保持已锁定 IP 角色动作与识别特征不变，产品位于视觉主轴，镜头略仰拍，中央构图，暖色高光与通透背景层次并存，强调品牌主视觉、产品质感、商业陈列节奏与成片完成度，1:1 画幅。' },
				{ id: '方案 02', title: '互动故事感', description: '让 IP 与产品形成互动关系，适合现场讲解创意逻辑。', prompt: '品牌商业海报，沿用已锁定 IP 角色动作与轮廓，不改变构图逻辑，让角色与产品形成明确互动关系，镜头中景，背景有层次但不喧宾夺主，突出故事感、情绪灯光、产品卖点和商业传播完成度，1:1 画幅。' },
				{ id: '方案 03', title: '信息转化型', description: '更适合电商说明与卖点拆解，结构紧凑直接。', prompt: '品牌商业海报，严格沿用已锁定 IP 形象与构图节奏，产品靠前展示，信息层级清晰，镜头平视，构图稳健，强调包装细节、卖点呈现、材质表现与即时转化感，背景克制且有高级商业质感，1:1 画幅。' },
				{ id: '方案 04', title: '舞台发布感', description: '强化成品发布氛围，适合比赛现场做视觉收束。', prompt: '品牌商业海报，保持已锁定 IP 角色、构图和主体关系，整体以发布舞台感为导向，镜头略广角，留出呼吸空间，重点强化终稿级灯光、层次、材质、品牌氛围与展示完成度，1:1 画幅。' }
			],
			final: [
				{ id: '终稿 01', title: '终稿主推版', description: '主视觉完整、适合第一屏展示。', image: SCRIPTED_IP_FIXTURE_FINAL_IMAGE_FILES[0] },
				{ id: '终稿 02', title: '终稿细节版', description: '更强调材质、结构与灯光精修。', image: SCRIPTED_IP_FIXTURE_FINAL_IMAGE_FILES[1] },
				{ id: '终稿 03', title: '终稿传播版', description: '适合社媒与活动延展的成片表达。', image: SCRIPTED_IP_FIXTURE_FINAL_IMAGE_FILES[2] },
				{ id: '终稿 04', title: '终稿陈列版', description: '适合线下展架与终端陈列展示。', image: SCRIPTED_IP_FIXTURE_FINAL_IMAGE_FILES[3] },
				{ id: '终稿 05', title: '终稿延展版', description: '适合补充第五张横向延展与备选展示。', image: SCRIPTED_IP_FIXTURE_FINAL_IMAGE_FILES[4] }
			]
		}, null, 2) + '\n';
	}

	private createScriptedWorkflowFixtureAssets(): readonly { filename: string; content: string }[] {
		const ipAssets = SCRIPTED_IP_FIXTURE_IP_IMAGE_FILES.map((filename, index) => ({
			filename,
			content: this.createScriptedWorkflowFixtureSvg(`IP ${String(index + 1).padStart(2, '0')}`, ['线稿锁定', '角色识别', '商业展示'][index % 3] ?? '角色展示', ['#BF5B31', '#2F6E67', '#8F341C', '#4C6658'][index % 4] ?? '#BF5B31')
		}));
		const finalAssets = SCRIPTED_IP_FIXTURE_FINAL_IMAGE_FILES.map((filename, index) => ({
			filename,
			content: this.createScriptedWorkflowFixtureSvg(`Final ${String(index + 1).padStart(2, '0')}`, ['终稿主推', '终稿精修', '终稿传播', '终稿陈列', '终稿延展'][index] ?? '终稿展示', ['#8F341C', '#2F6E67', '#805936', '#445A73', '#6A4A8A'][index % 5] ?? '#8F341C')
		}));
		return [...ipAssets, ...finalAssets];
	}

	private createScriptedWorkflowFixtureSvg(title: string, subtitle: string, accent: string): string {
		return [
			'<?xml version="1.0" encoding="UTF-8"?>',
			'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080">',
			'  <defs>',
			`    <linearGradient id="bg-${title.replace(/\s+/g, '-').toLowerCase()}" x1="0%" y1="0%" x2="100%" y2="100%">`,
			`      <stop offset="0%" stop-color="${accent}" stop-opacity="0.95" />`,
			'      <stop offset="100%" stop-color="#1D1712" stop-opacity="1" />',
			'    </linearGradient>',
			'  </defs>',
			`  <rect width="1080" height="1080" rx="48" fill="url(#bg-${title.replace(/\s+/g, '-').toLowerCase()})" />`,
			'  <circle cx="846" cy="228" r="168" fill="rgba(255,255,255,0.12)" />',
			'  <circle cx="228" cy="848" r="204" fill="rgba(255,255,255,0.08)" />',
			'  <rect x="110" y="118" width="860" height="844" rx="42" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.18)" />',
			`  <text x="110" y="212" font-family="Microsoft YaHei, PingFang SC, sans-serif" font-size="60" font-weight="700" fill="#FFF5EB">${title}</text>`,
			`  <text x="110" y="286" font-family="Microsoft YaHei, PingFang SC, sans-serif" font-size="28" font-weight="500" fill="rgba(255,245,235,0.78)">${subtitle}</text>`,
			'  <text x="110" y="796" font-family="Microsoft YaHei, PingFang SC, sans-serif" font-size="176" font-weight="800" fill="rgba(255,255,255,0.18)">BrandVision</text>',
			'  <text x="110" y="872" font-family="Microsoft YaHei, PingFang SC, sans-serif" font-size="34" font-weight="600" fill="rgba(255,245,235,0.72)">BrandVision Showcase Asset</text>',
			'</svg>',
			''
		].join('\n');
	}

	private createScriptedWorkflowInputSection(inputSection: string, workflowVersion: ScriptedWorkflowVersion): string {
		const guidanceBlock = workflowVersion === 'v1'
			? [
				'          <div class="upload-guidance">',
				'            <div class="upload-guidance-copy">',
				'              <strong class="upload-guidance-title">上传说明</strong>',
				'              <div class="muted">请同时准备手绘 IP 与产品参考图，并保持画面主体完整、边缘清晰、无遮挡、风格信息充分，这样后续生成环节才能更稳定地延续当前画面语义与展示目标。</div>',
				'            </div>',
				'          </div>'
			].join('\n')
			: [
				'          <div class="upload-guidance upload-guidance-stable">',
				'            <div class="upload-guidance-copy">',
				'              <strong class="upload-guidance-title">上传说明</strong>',
				'              <div class="muted">建议上传主体清晰、边缘完整的参考图。页面会在上传后自动整理图片尺寸，方便继续进入后续生成流程。</div>',
				'            </div>',
				'          </div>'
			].join('\n');

		const withGuidance = inputSection.replace(
			/(<div class="selection-meta"[^>]*>\s*<strong>素材上传区<\/strong>\s*<\/div>)/,
			`$1\n${guidanceBlock}`
		);

		return withGuidance.replace(
			/(<div class="cta-row"[^>]*>[\s\S]*?<button class="secondary-button" type="button" id="resetAll">重置流程<\/button>\s*<\/div>)/,
			[
				'$1',
				'          <div class="upload-inline-status" id="uploadStatus" data-state="idle" aria-live="polite"></div>'
			].join('\n')
		);
	}

	private createScriptedWorkflowCss(css: string, workflowVersion: ScriptedWorkflowVersion): string {
		const sharedCss = [
			'.upload-guidance {',
			'  position: relative;',
			'}',
			'',
			'.upload-guidance-title {',
			'  display: block;',
			'  margin-bottom: 6px;',
			'  font-size: 12px;',
			'  letter-spacing: .08em;',
			'  text-transform: uppercase;',
			'}',
			'',
			'.upload-guidance-copy {',
			'  font-size: 13px;',
			'}',
			'',
			'.upload-inline-status {',
			'  min-height: 24px;',
			'  margin-top: 12px;',
			'  padding: 12px 14px;',
			'  border-radius: 16px;',
			'  border: 1px solid rgba(255, 255, 255, 0.08);',
			'  background: rgba(255, 255, 255, 0.04);',
			'  color: var(--muted);',
			'  font-size: 13px;',
			'  line-height: 1.45;',
			'  transition: border-color .2s ease, background .2s ease, color .2s ease;',
			'}',
			'',
			'.upload-inline-status[data-state="idle"] {',
			'  padding: 0;',
			'  min-height: 0;',
			'  border: 0;',
			'  background: transparent;',
			'}',
			'',
			'.upload-inline-status[data-state="info"] {',
			'  border-color: rgba(105, 190, 255, 0.22);',
			'  background: rgba(42, 97, 154, 0.14);',
			'  color: #dcefff;',
			'}',
			'',
			'.upload-inline-status[data-state="success"] {',
			'  border-color: rgba(94, 214, 158, 0.24);',
			'  background: rgba(24, 84, 58, 0.18);',
			'  color: #d6ffec;',
			'}',
			'',
			'.upload-inline-status[data-state="error"] {',
			'  border-color: rgba(255, 126, 126, 0.3);',
			'  background: rgba(97, 25, 31, 0.2);',
			'  color: #ffe1e1;',
			'}',
			''
		].join('\n');

		const variantCss = workflowVersion === 'v1'
			? [
				'/* scripted-ip-upload-variant:start */',
				'.upload-card:first-child {',
				'  overflow: visible;',
				'}',
				'',
				'.upload-guidance {',
				'  margin: 2px 0 -34px;',
				'  min-height: 0;',
				'  z-index: 2;',
				'}',
				'',
				'.upload-guidance-copy {',
				'  position: absolute;',
				'  top: 0;',
				'  left: 0;',
				'  right: -42px;',
				'  max-width: none;',
				'  line-height: 1.02;',
				'}',
				'',
				'.upload-guidance .muted {',
				'  display: block;',
				'  white-space: normal;',
				'  overflow-wrap: anywhere;',
				'}',
				'',
				'.preview-grid {',
				'  margin-top: 8px;',
				'}',
				'/* scripted-ip-upload-variant:end */',
				''
			].join('\n')
			: [
				'/* scripted-ip-upload-variant:start */',
				'.upload-card:first-child {',
				'  overflow: hidden;',
				'}',
				'',
				'.upload-guidance {',
				'  margin: 10px 0 14px;',
				'  padding: 14px 16px;',
				'  border-radius: 18px;',
				'  background: rgba(255, 255, 255, 0.04);',
				'  border: 1px solid rgba(255, 255, 255, 0.08);',
				'}',
				'',
				'.upload-guidance-copy {',
				'  position: static;',
				'  max-width: 100%;',
				'  line-height: 1.45;',
				'}',
				'',
				'.upload-guidance .muted {',
				'  display: block;',
				'  white-space: normal;',
				'  overflow-wrap: anywhere;',
				'}',
				'',
				'.preview-grid {',
				'  margin-top: 18px;',
				'}',
				'/* scripted-ip-upload-variant:end */',
				''
			].join('\n');

		return css + '\n' + sharedCss + '\n' + variantCss;
	}

	private createScriptedWorkflowJs(js: string, workflowVersion: ScriptedWorkflowVersion): string {
		const versionJs = workflowVersion === 'v1'
			? this.createScriptedWorkflowV1UploadScript()
			: this.createScriptedWorkflowV2UploadScript();

		return js + '\n' + versionJs;
	}

	private createScriptedWorkflowV1UploadScript(): string {
		return [
			'',
			'/* scripted-ip-upload-workflow:start */',
			'(function () {',
			'  const uploadStatusEl = document.getElementById("uploadStatus");',
			'  const ipInputEl = document.getElementById("ipInput");',
			'  const productInputEl = document.getElementById("productInput");',
			'  const resetAllBtn = document.getElementById("resetAll");',
			'  const imageLimitMessage = "Image validation failed: the reference image exceeds the supported size limit. Please resize the longest edge to 1536 px or below and keep the file under 4 MB.";',
			'  const maxEdge = 1536;',
			'  const maxBytes = 4 * 1024 * 1024;',
			'  const originalReadPreview = readPreview;',
			'  const originalHandleGenerateIp = handleGenerateIp;',
			'',
			'  state.uploadDiagnostics = state.uploadDiagnostics || { ip: null, product: null };',
			'',
			'  function setUploadStatus(message, type) {',
			'    if (!uploadStatusEl) {',
			'      return;',
			'    }',
			'    if (!message) {',
			'      uploadStatusEl.textContent = "";',
			'      uploadStatusEl.dataset.state = "idle";',
			'      return;',
			'    }',
			'    uploadStatusEl.textContent = message;',
			'    uploadStatusEl.dataset.state = type || "info";',
			'  }',
			'',
			'  function wait(ms) {',
			'    return new Promise(resolve => setTimeout(resolve, ms));',
			'  }',
			'',
			'  function getImageMetrics(dataUrl) {',
			'    return new Promise((resolve, reject) => {',
			'      const img = new Image();',
			'      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight, longestEdge: Math.max(img.naturalWidth, img.naturalHeight) });',
			'      img.onerror = () => reject(new Error("图片尺寸读取失败"));',
			'      img.src = dataUrl;',
			'    });',
			'  }',
			'',
			'  async function recordUploadState(input, img, wrapper, key) {',
			'    await originalReadPreview(input, img, wrapper, key);',
			'    const file = input.files && input.files[0];',
			'    const ref = state.refs[key];',
			'    if (!file || !ref) {',
			'      return;',
			'    }',
			'    const metrics = await getImageMetrics(ref.dataUrl);',
			'    const nextMeta = {',
			'      name: file.name,',
			'      mimeType: ref.mimeType,',
			'      size: file.size,',
			'      width: metrics.width,',
			'      height: metrics.height,',
			'      longestEdge: metrics.longestEdge',
			'    };',
			'    state.refs[key] = { ...ref, ...nextMeta };',
			'    state.uploadDiagnostics[key] = nextMeta;',
			'    setUploadStatus("", "idle");',
			'  }',
			'',
			'  function isOversized(ref) {',
			'    if (!ref) {',
			'      return false;',
			'    }',
			'    return Number(ref.longestEdge || 0) > maxEdge || Number(ref.size || 0) > maxBytes;',
			'  }',
			'',
			'  async function runGenerateIpWithValidation() {',
			'    const originalText = confirmUploadBtn.textContent;',
			'    confirmUploadBtn.disabled = true;',
			'    confirmUploadBtn.textContent = "正在生成...";',
			'    try {',
			'      setUploadStatus("", "idle");',
			'      if (!state.refs.ip) {',
			'        throw new Error("请先上传手绘 IP。");',
			'      }',
			'      if (isOversized(state.refs.ip)) {',
			'        await wait(10000);',
			'        setUploadStatus(imageLimitMessage, "error");',
			'        return;',
			'      }',
			'      await originalHandleGenerateIp();',
			'    } catch (error) {',
			'      setUploadStatus(error.message || "生成失败。", "error");',
			'    } finally {',
			'      confirmUploadBtn.disabled = false;',
			'      confirmUploadBtn.textContent = originalText;',
			'    }',
			'  }',
			'',
			'  ipInputEl.addEventListener("change", event => {',
			'    event.preventDefault();',
			'    event.stopImmediatePropagation();',
			'    void recordUploadState(ipInputEl, document.getElementById("ipPreview"), document.getElementById("ipDropzone"), "ip").catch(error => {',
			'      setUploadStatus(error.message || "文件读取失败。", "error");',
			'    });',
			'  }, true);',
			'',
			'  productInputEl.addEventListener("change", event => {',
			'    event.preventDefault();',
			'    event.stopImmediatePropagation();',
			'    void recordUploadState(productInputEl, document.getElementById("productPreview"), document.getElementById("productDropzone"), "product").catch(error => {',
			'      setUploadStatus(error.message || "文件读取失败。", "error");',
			'    });',
			'  }, true);',
			'',
			'  confirmUploadBtn.addEventListener("click", event => {',
			'    event.preventDefault();',
			'    event.stopImmediatePropagation();',
			'    void runGenerateIpWithValidation();',
			'  }, true);',
			'',
			'  resetAllBtn.addEventListener("click", () => {',
			'    setUploadStatus("", "idle");',
			'    state.uploadDiagnostics = { ip: null, product: null };',
			'  }, true);',
			'})();',
			'/* scripted-ip-upload-workflow:end */',
			''
		].join('\n');
	}

	private createScriptedWorkflowV2UploadScript(): string {
		return [
			'',
			'/* scripted-ip-upload-workflow:start */',
			'(function () {',
			'  const uploadStatusEl = document.getElementById("uploadStatus");',
			'  const ipInputEl = document.getElementById("ipInput");',
			'  const productInputEl = document.getElementById("productInput");',
			'  const resetAllBtn = document.getElementById("resetAll");',
			'  const maxEdge = 1536;',
			'  const maxBytes = 4 * 1024 * 1024;',
			'  const imagePreprocessFailureMessage = "Image preprocessing failed: the uploaded file could not be reduced to the supported size profile. Please try another image with a simpler background or lower native resolution.";',
			'  const originalReadPreview = readPreview;',
			'  const originalHandleGenerateIp = handleGenerateIp;',
			'  const originalApplyGeneratedImage = applyGeneratedImage;',
			'  const originalClearGeneratedImage = clearGeneratedImage;',
			'',
			'  applyGeneratedImage = function (card, dataUrl) {',
			'    originalApplyGeneratedImage(card, dataUrl);',
			'    const visual = card.querySelector(".selection-visual, .poster-visual, .final-visual");',
			'    if (visual) {',
			'      visual.classList.remove("empty");',
			'    }',
			'  };',
			'',
			'  clearGeneratedImage = function (card) {',
			'    originalClearGeneratedImage(card);',
			'    const visual = card.querySelector(".selection-visual, .poster-visual, .final-visual");',
			'    if (visual) {',
			'      visual.classList.add("empty");',
			'    }',
			'  };',
			'',
			'  state.uploadDiagnostics = state.uploadDiagnostics || { ip: null, product: null };',
			'',
			'  function setUploadStatus(message, type) {',
			'    if (!uploadStatusEl) {',
			'      return;',
			'    }',
			'    if (!message) {',
			'      uploadStatusEl.textContent = "";',
			'      uploadStatusEl.dataset.state = "idle";',
			'      return;',
			'    }',
			'    uploadStatusEl.textContent = message;',
			'    uploadStatusEl.dataset.state = type || "info";',
			'  }',
			'',
			'  function blobToDataUrl(blob) {',
			'    return new Promise((resolve, reject) => {',
			'      const reader = new FileReader();',
			'      reader.onload = event => resolve(event.target.result);',
			'      reader.onerror = () => reject(new Error("文件读取失败"));',
			'      reader.readAsDataURL(blob);',
			'    });',
			'  }',
			'',
			'  function loadImage(dataUrl) {',
			'    return new Promise((resolve, reject) => {',
			'      const img = new Image();',
			'      img.onload = () => resolve(img);',
			'      img.onerror = () => reject(new Error("图片尺寸读取失败"));',
			'      img.src = dataUrl;',
			'    });',
			'  }',
			'',
			'  function canvasToBlob(canvas, mimeType, quality) {',
			'    return new Promise((resolve, reject) => {',
			'      canvas.toBlob(blob => {',
			'        if (!blob) {',
			'          reject(new Error("图片压缩失败"));',
			'          return;',
			'        }',
			'        resolve(blob);',
			'      }, mimeType, quality);',
			'    });',
			'  }',
			'',
			'  async function preprocessImage(file) {',
			'    const originalDataUrl = await fileToDataUrl(file);',
			'    const sourceImage = await loadImage(originalDataUrl);',
			'    const longestEdge = Math.max(sourceImage.naturalWidth, sourceImage.naturalHeight) || 1;',
			'    const scale = longestEdge > maxEdge ? maxEdge / longestEdge : 1;',
			'    const width = Math.max(1, Math.round(sourceImage.naturalWidth * scale));',
			'    const height = Math.max(1, Math.round(sourceImage.naturalHeight * scale));',
			'    const canvas = document.createElement("canvas");',
			'    canvas.width = width;',
			'    canvas.height = height;',
			'    const context = canvas.getContext("2d");',
			'    if (!context) {',
			'      throw new Error(imagePreprocessFailureMessage);',
			'    }',
			'    context.drawImage(sourceImage, 0, 0, width, height);',
			'',
			'    const candidates = [',
			'      { mimeType: file.type === "image/png" ? "image/png" : "image/jpeg", quality: 0.92 },',
			'      { mimeType: "image/jpeg", quality: 0.88 },',
			'      { mimeType: "image/jpeg", quality: 0.8 },',
			'      { mimeType: "image/jpeg", quality: 0.72 },',
			'      { mimeType: "image/jpeg", quality: 0.64 },',
			'      { mimeType: "image/jpeg", quality: 0.56 }',
			'    ];',
			'',
			'    let chosenBlob = null;',
			'    let chosenMimeType = file.type || "image/png";',
			'    for (const candidate of candidates) {',
			'      const blob = await canvasToBlob(canvas, candidate.mimeType, candidate.quality);',
			'      if (!chosenBlob || blob.size < chosenBlob.size) {',
			'        chosenBlob = blob;',
			'        chosenMimeType = candidate.mimeType;',
			'      }',
			'      if (blob.size <= maxBytes) {',
			'        chosenBlob = blob;',
			'        chosenMimeType = candidate.mimeType;',
			'        break;',
			'      }',
			'    }',
			'',
			'    if (!chosenBlob || chosenBlob.size > maxBytes) {',
			'      throw new Error(imagePreprocessFailureMessage);',
			'    }',
			'',
			'    const dataUrl = await blobToDataUrl(chosenBlob);',
			'    return {',
			'      name: file.name,',
			'      mimeType: chosenMimeType,',
			'      size: chosenBlob.size,',
			'      width,',
			'      height,',
			'      longestEdge: Math.max(width, height),',
			'      dataUrl,',
			'      wasCompressed: scale < 1 || chosenBlob.size !== file.size || chosenMimeType !== (file.type || "image/png")',
			'    };',
			'  }',
			'',
			'  async function applyCompressedPreview(input, img, wrapper, key) {',
			'    const file = input.files && input.files[0];',
			'    if (!file) {',
			'      return;',
			'    }',
			'    await originalReadPreview(input, img, wrapper, key);',
			'    setUploadStatus("", "idle");',
			'    const processed = await preprocessImage(file);',
			'    img.src = processed.dataUrl;',
			'    wrapper.classList.add("has-image");',
			'    state.refs[key] = {',
			'      name: processed.name,',
			'      mimeType: processed.mimeType,',
			'      data: processed.dataUrl.split(",")[1],',
			'      dataUrl: processed.dataUrl,',
			'      size: processed.size,',
			'      width: processed.width,',
			'      height: processed.height,',
			'      longestEdge: processed.longestEdge',
			'    };',
			'    state.inputVersion[key] = (state.inputVersion[key] || 0) + 1;',
			'    state.uploadDiagnostics[key] = processed;',
			'    setUploadStatus(processed.wasCompressed ? "Reference image prepared for generation. Size and resolution were optimized automatically." : "Reference image is ready for generation.", processed.wasCompressed ? "success" : "info");',
			'  }',
			'',
			'  async function runGenerateIp() {',
			'    const originalText = confirmUploadBtn.textContent;',
			'    confirmUploadBtn.disabled = true;',
			'    confirmUploadBtn.textContent = "正在生成...";',
			'    try {',
			'      setUploadStatus("", "idle");',
			'      await originalHandleGenerateIp();',
			'    } catch (error) {',
			'      setUploadStatus(error.message || "生成失败。", "error");',
			'    } finally {',
			'      confirmUploadBtn.disabled = false;',
			'      confirmUploadBtn.textContent = originalText;',
			'    }',
			'  }',
			'',
			'  ipInputEl.addEventListener("change", event => {',
			'    event.preventDefault();',
			'    event.stopImmediatePropagation();',
			'    void applyCompressedPreview(ipInputEl, document.getElementById("ipPreview"), document.getElementById("ipDropzone"), "ip").catch(error => {',
			'      setUploadStatus(error.message || imagePreprocessFailureMessage, "error");',
			'    });',
			'  }, true);',
			'',
			'  productInputEl.addEventListener("change", event => {',
			'    event.preventDefault();',
			'    event.stopImmediatePropagation();',
			'    void applyCompressedPreview(productInputEl, document.getElementById("productPreview"), document.getElementById("productDropzone"), "product").catch(error => {',
			'      setUploadStatus(error.message || imagePreprocessFailureMessage, "error");',
			'    });',
			'  }, true);',
			'',
			'  confirmUploadBtn.addEventListener("click", event => {',
			'    event.preventDefault();',
			'    event.stopImmediatePropagation();',
			'    void runGenerateIp();',
			'  }, true);',
			'',
			'  resetAllBtn.addEventListener("click", () => {',
			'    setUploadStatus("", "idle");',
			'    state.uploadDiagnostics = { ip: null, product: null };',
			'  }, true);',
			'})();',
			'/* scripted-ip-upload-workflow:end */',
			''
		].join('\n');
	}

	private async applyScriptedWorkflowRevisionPatch(workflow: IScriptedWorkflow, projectFiles: IScriptedWorkflowProjectFiles, progress: (part: IChatProgress) => void): Promise<void> {
		const expectedHtml = [
			projectFiles.htmlSections.shell,
			projectFiles.htmlSections.inputSection,
			projectFiles.htmlSections.buildSection,
			projectFiles.htmlSections.layoutSection,
			projectFiles.htmlSections.outputSection,
			projectFiles.htmlSections.footer
		].join('');
		const currentHtml = await this.tryReadFileContent(workflow.targetFile);
		if (!currentHtml || !currentHtml.trim()) {
			progress({
				kind: 'progressMessage',
				content: new MarkdownString('正在恢复页面入口文件。'),
				shimmer: true
			});
			await this.fileService.writeFile(workflow.targetFile, VSBuffer.fromString(expectedHtml));
			await this.openScriptedWorkflowEditorAtEnd(workflow.targetFile, expectedHtml);
			await timeout(Math.max(600, Math.floor(SCRIPTED_IP_WORKFLOW_STEP_DELAY / 2)));
		}

		await this.applyScriptedWorkflowMarkedPatch(
			workflow.styleFile,
			projectFiles.css,
			'/* scripted-ip-upload-variant:start */',
			'/* scripted-ip-upload-variant:end */',
			'正在调整上传区布局与文案容器。',
			progress
		);
		await this.applyScriptedWorkflowMarkedPatch(
			workflow.scriptFile,
			projectFiles.js,
			'/* scripted-ip-upload-workflow:start */',
			'/* scripted-ip-upload-workflow:end */',
			'正在更新图片上传预处理与生成前检查逻辑。',
			progress
		);
		await this.fileService.writeFile(workflow.planFile, VSBuffer.fromString(projectFiles.planJson));
		await this.fileService.writeFile(workflow.readmeFile, VSBuffer.fromString(projectFiles.readme));
		await this.fileService.writeFile(workflow.assetNotesFile, VSBuffer.fromString(projectFiles.assetNotes));
	}

	private async applyScriptedWorkflowMarkedPatch(resource: URI, nextContent: string, startMarker: string, endMarker: string, message: string, progress: (part: IChatProgress) => void): Promise<void> {
		const currentContent = await this.readFileContent(resource);
		const currentRegion = this.getScriptedWorkflowMarkedRegion(currentContent, startMarker, endMarker);
		const nextRegion = this.getScriptedWorkflowMarkedRegion(nextContent, startMarker, endMarker);
		if (!currentRegion || !nextRegion) {
			await this.fileService.writeFile(resource, VSBuffer.fromString(nextContent));
			return;
		}

		if (this.isScriptedWorkflowSafePatchTarget(resource, startMarker, endMarker)) {
			await this.applyScriptedWorkflowSafeMarkedPatch(resource, currentContent, currentRegion, nextRegion, message, progress);
			return;
		}

		progress({
			kind: 'progressMessage',
			content: new MarkdownString(message),
			shimmer: true
		});
		await this.openScriptedWorkflowEditorWithRange(resource, this.createScriptedWorkflowRange(currentContent, currentRegion.start, currentRegion.end));
		progress({
			kind: 'textEdit',
			uri: resource,
			edits: [{ range: this.createScriptedWorkflowRange(currentContent, currentRegion.start, currentRegion.end), text: nextRegion.content }],
			done: true
		});
		const updatedContent = currentContent.slice(0, currentRegion.start) + nextRegion.content + currentContent.slice(currentRegion.end);
		await this.fileService.writeFile(resource, VSBuffer.fromString(updatedContent));
		await this.openScriptedWorkflowEditorWithRange(resource, this.createScriptedWorkflowRange(updatedContent, currentRegion.start, currentRegion.start + nextRegion.content.length));
		await timeout(SCRIPTED_IP_WORKFLOW_STEP_DELAY);
	}

	private isScriptedWorkflowSafePatchTarget(resource: URI, startMarker: string, endMarker: string): boolean {
		return resource.path.endsWith(`/${SCRIPTED_IP_WORKFLOW_SCRIPT_FILE}`)
			&& startMarker === '/* scripted-ip-upload-workflow:start */'
			&& endMarker === '/* scripted-ip-upload-workflow:end */';
	}

	private async applyScriptedWorkflowSafeMarkedPatch(
		resource: URI,
		currentContent: string,
		currentRegion: { start: number; end: number; content: string },
		nextRegion: { start: number; end: number; content: string },
		message: string,
		progress: (part: IChatProgress) => void
	): Promise<void> {
		if (!this.isValidScriptedWorkflowUploadRegion(nextRegion.content)) {
			throw new Error('Refusing to write invalid scripted workflow upload region.');
		}

		progress({
			kind: 'progressMessage',
			content: new MarkdownString(message),
			shimmer: true
		});
		await this.openScriptedWorkflowEditorWithRange(resource, this.createScriptedWorkflowRange(currentContent, currentRegion.start, currentRegion.end));

		const updatedContent = currentContent.slice(0, currentRegion.start) + nextRegion.content + currentContent.slice(currentRegion.end);
		await this.fileService.writeFile(resource, VSBuffer.fromString(updatedContent));

		const verifiedContent = await this.readFileContent(resource);
		const verifiedRegion = this.getScriptedWorkflowMarkedRegion(
			verifiedContent,
			'/* scripted-ip-upload-workflow:start */',
			'/* scripted-ip-upload-workflow:end */'
		);
		if (!verifiedRegion || !this.isValidScriptedWorkflowUploadRegion(verifiedRegion.content)) {
			throw new Error('Scripted workflow upload region verification failed after patch write.');
		}

		await this.openScriptedWorkflowEditorWithRange(resource, this.createScriptedWorkflowRange(verifiedContent, verifiedRegion.start, verifiedRegion.end));
		await timeout(SCRIPTED_IP_WORKFLOW_STEP_DELAY);
	}

	private isValidScriptedWorkflowUploadRegion(content: string): boolean {
		const requiredSnippets = [
			'const maxEdge = 1536;',
			'const maxBytes = 4 * 1024 * 1024;',
			'const imagePreprocessFailureMessage = "Image preprocessing failed: the uploaded file could not be reduced to the supported size profile. Please try another image with a simpler background or lower native resolution.";',
			'const originalReadPreview = readPreview;',
			'await originalReadPreview(input, img, wrapper, key);',
			'const processed = await preprocessImage(file);'
		];
		const forbiddenSnippets = [
			'const axxEdEd = 1536;',
			'const e agePreprocessFa',
			'blobToDlbaUrlTblobataUrl',
			'apyCmpressePreviw',
			'namap.nyCampresseePreviw'
		];

		return requiredSnippets.every(snippet => content.includes(snippet))
			&& forbiddenSnippets.every(snippet => !content.includes(snippet));
	}

	private getScriptedWorkflowMarkedRegion(content: string, startMarker: string, endMarker: string): { start: number; end: number; content: string } | undefined {
		const start = content.indexOf(startMarker);
		const endMarkerStart = content.indexOf(endMarker);
		if (start === -1 || endMarkerStart === -1 || endMarkerStart < start) {
			return undefined;
		}

		const end = endMarkerStart + endMarker.length;
		return {
			start,
			end,
			content: content.slice(start, end)
		};
	}

	private createScriptedWorkflowRange(content: string, startOffset: number, endOffset: number): Range {
		const start = this.createScriptedWorkflowPosition(content, startOffset);
		const end = this.createScriptedWorkflowPosition(content, endOffset);
		return new Range(start.lineNumber, start.column, end.lineNumber, end.column);
	}

	private createScriptedWorkflowPosition(content: string, offset: number): { lineNumber: number; column: number } {
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

	private extractScriptedWorkflowStyle(shell: string): string {
		const match = shell.match(/<style>([\s\S]*?)<\/style>/);
		if (!match) {
			throw new Error('Failed to extract scripted workflow style block.');
		}

		return match[1].trim() + '\n';
	}

	private rewriteScriptedWorkflowShell(shell: string): string {
		return shell.replace(/<style>[\s\S]*?<\/style>/, '  <link rel="stylesheet" href="./styles.css">');
	}

	private extractScriptedWorkflowScript(footer: string): string {
		const match = footer.match(/<script>([\s\S]*?)<\/script>/);
		if (!match) {
			throw new Error('Failed to extract scripted workflow script block.');
		}

		return match[1].trim() + '\n';
	}

	private async areScriptedWorkflowProjectFilesUpToDate(workflow: IScriptedWorkflow, projectFiles: IScriptedWorkflowProjectFiles): Promise<boolean> {
		const expectedHtml = [
			projectFiles.htmlSections.shell,
			projectFiles.htmlSections.inputSection,
			projectFiles.htmlSections.buildSection,
			projectFiles.htmlSections.layoutSection,
			projectFiles.htmlSections.outputSection,
			projectFiles.htmlSections.footer
		].join('');

		const checks: Array<[URI, string]> = [
			[workflow.targetFile, expectedHtml],
			[workflow.styleFile, projectFiles.css],
			[workflow.scriptFile, projectFiles.js],
			[workflow.planFile, projectFiles.planJson],
			[workflow.readmeFile, projectFiles.readme],
			[workflow.assetNotesFile, projectFiles.assetNotes]
		];

		for (const [resource, expected] of checks) {
			const actual = await this.tryReadFileContent(resource);
			if (actual !== expected) {
				return false;
			}
		}

		return true;
	}

	private async writeScriptedWorkflowProjectFiles(workflow: IScriptedWorkflow, projectFiles: IScriptedWorkflowProjectFiles, progress: (part: IChatProgress) => void): Promise<void> {
		await this.openScriptedWorkflowEditor(workflow.targetFile);
		await this.writeScriptedWorkflowHtmlFileInSections(workflow.targetFile, projectFiles.htmlSections, progress);
		await this.streamScriptedWorkflowFile(workflow.styleFile, '样式系统', projectFiles.css, 'css', '正在整理页面样式与视觉层级。', 8500, 20, progress);
		await this.streamScriptedWorkflowFile(workflow.scriptFile, '交互逻辑', projectFiles.js, 'javascript', '正在整理页面交互与状态逻辑。', 9000, 22, progress);
		await this.streamScriptedWorkflowFile(workflow.planFile, '页面配置', projectFiles.planJson, 'json', '正在写入页面配置与本轮方案摘要。', 3200, 8, progress);
		await this.streamScriptedWorkflowFile(workflow.readmeFile, '项目说明', projectFiles.readme, 'markdown', '正在补充目录说明与使用提示。', 2600, 6, progress);
		await this.streamScriptedWorkflowFile(workflow.assetNotesFile, '素材说明', projectFiles.assetNotes, 'markdown', '正在补充素材目录说明。', 2200, 5, progress);
	}

	private async writeScriptedWorkflowHtmlFileInSections(targetFile: URI, sections: IScriptedWorkflowTemplateSections, progress: (part: IChatProgress) => void): Promise<void> {
		const steps = [
			{ base: '', section: sections.shell, key: 'customKeywordResponse.ip.writing.shell', message: "正在写入页面骨架与全局样式。", label: '页面骨架' },
			{ base: sections.shell, section: sections.inputSection, key: 'customKeywordResponse.ip.writing.input', message: "正在补充上传区与阶段流程。", label: '上传区与阶段流程' },
			{ base: sections.shell + sections.inputSection, section: sections.buildSection, key: 'customKeywordResponse.ip.writing.build', message: "正在补充 IP 构筑区。", label: 'IP 构筑区' },
			{ base: sections.shell + sections.inputSection + sections.buildSection, section: sections.layoutSection, key: 'customKeywordResponse.ip.writing.layout', message: "正在补充海报方案区。", label: '海报方案区' },
			{ base: sections.shell + sections.inputSection + sections.buildSection + sections.layoutSection, section: sections.outputSection + sections.footer, key: 'customKeywordResponse.ip.writing.output', message: "正在补充终稿输出区并完成页面收尾。", label: '终稿输出与收尾' }
		] as const;

		for (const step of steps) {
			progress({
				kind: 'progressMessage',
				content: new MarkdownString(localize(step.key, step.message)),
				shimmer: true
			});

			const frameDelays = this.createScriptedWorkflowFrameDelays(SCRIPTED_IP_WORKFLOW_SECTION_TOTAL_DELAY, SCRIPTED_IP_WORKFLOW_SECTION_UPDATES);
			for (let index = 1; index <= SCRIPTED_IP_WORKFLOW_SECTION_UPDATES; index++) {
				const partialSection = this.takeScriptedWorkflowChunk(step.section, index, SCRIPTED_IP_WORKFLOW_SECTION_UPDATES);
				const nextContent = step.base + partialSection;
				await this.fileService.writeFile(targetFile, VSBuffer.fromString(nextContent));
				await this.openScriptedWorkflowEditorAtEnd(targetFile, nextContent);
				await timeout(frameDelays[index - 1]);
			}
		}
	}

	private async streamScriptedWorkflowFile(resource: URI, label: string, content: string, language: string, message: string, totalDelay: number, updates: number, progress: (part: IChatProgress) => void): Promise<void> {
		progress({
			kind: 'progressMessage',
			content: new MarkdownString(message),
			shimmer: true
		});
		await this.openScriptedWorkflowEditor(resource);

		const frameDelays = this.createScriptedWorkflowFrameDelays(totalDelay, updates);
		for (let index = 1; index <= updates; index++) {
			const partialContent = this.takeScriptedWorkflowChunk(content, index, updates);
			await this.fileService.writeFile(resource, VSBuffer.fromString(partialContent));
			await this.openScriptedWorkflowEditorAtEnd(resource, partialContent);
			await timeout(frameDelays[index - 1]);
		}
	}

	private createScriptedWorkflowFrameDelays(totalDelay: number, frames: number): number[] {
		const delays: number[] = [];
		let assigned = 0;

		for (let index = 0; index < frames; index++) {
			let weight: number;
			if (index < 4) {
				weight = 0.8;
			} else if (index >= frames - 4) {
				weight = 1.2;
			} else {
				weight = 1;
			}

			const delay = Math.max(180, Math.round((totalDelay / frames) * weight));
			delays.push(delay);
			assigned += delay;
		}

		delays[delays.length - 1] += totalDelay - assigned;
		return delays;
	}

	private takeScriptedWorkflowChunk(content: string, index: number, total: number): string {
		const normalizedContent = content.replace(/\r\n/g, '\n');
		const targetLength = Math.max(1, Math.min(normalizedContent.length, Math.ceil(normalizedContent.length * (index / total))));
		if (targetLength >= normalizedContent.length) {
			return normalizedContent;
		}

		const lookahead = Math.min(normalizedContent.length, targetLength + 48);
		for (let cursor = targetLength; cursor < lookahead; cursor++) {
			const currentChar = normalizedContent[cursor];
			if (currentChar === '\n' || currentChar === '>' || currentChar === ' ') {
				return normalizedContent.slice(0, cursor + 1);
			}
		}

		return normalizedContent.slice(0, targetLength);
	}

	private async openScriptedWorkflowEditor(resource: URI): Promise<void> {
		await this.editorService.openEditor({
			resource,
			options: {
				preserveFocus: false,
				revealIfOpened: true,
				pinned: true
			}
		});
	}

	private async openScriptedWorkflowEditorWithRange(resource: URI, range: Range): Promise<void> {
		await this.editorService.openEditor({
			resource,
			options: {
				preserveFocus: false,
				revealIfOpened: true,
				pinned: true,
				selection: {
					startLineNumber: range.startLineNumber,
					startColumn: range.startColumn,
					endLineNumber: range.endLineNumber,
					endColumn: range.endColumn
				}
			}
		});
	}

	private async openScriptedWorkflowEditorAtEnd(resource: URI, content: string): Promise<void> {
		const position = this.createScriptedWorkflowPosition(content, content.length);
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

	private splitScriptedWorkflowTemplate(templateContent: string): IScriptedWorkflowTemplateSections {
		const uploadSectionStart = templateContent.indexOf('<section class="section glass" id="uploadSection">');
		const ipSectionStart = templateContent.indexOf('<section class="section glass" id="ipSection">');
		const posterSectionStart = templateContent.indexOf('<section class="section glass" id="posterSection">');
		const finalSectionStart = templateContent.indexOf('<section class="section glass" id="finalSection">');
		const footerStart = templateContent.indexOf('\n  <script>');

		if (uploadSectionStart === -1 || ipSectionStart === -1 || posterSectionStart === -1 || finalSectionStart === -1 || footerStart === -1) {
			throw new Error('Failed to split scripted workflow template into sections.');
		}

		return {
			shell: templateContent.slice(0, uploadSectionStart),
			inputSection: templateContent.slice(uploadSectionStart, ipSectionStart),
			buildSection: templateContent.slice(ipSectionStart, posterSectionStart),
			layoutSection: templateContent.slice(posterSectionStart, finalSectionStart),
			outputSection: templateContent.slice(finalSectionStart, footerStart),
			footer: templateContent.slice(footerStart)
		};
	}

	private createScriptedWorkflowTreeData(workflow: IScriptedWorkflow, launcherFile?: URI): IChatResponseProgressFileTreeData {
		const children: IChatResponseProgressFileTreeData[] = [
			{ label: SCRIPTED_IP_WORKFLOW_FILE, uri: workflow.targetFile },
			{ label: SCRIPTED_IP_WORKFLOW_STYLE_FILE, uri: workflow.styleFile },
			{ label: SCRIPTED_IP_WORKFLOW_SCRIPT_FILE, uri: workflow.scriptFile },
			{ label: SCRIPTED_IP_WORKFLOW_README_FILE, uri: workflow.readmeFile },
			{
				label: SCRIPTED_IP_WORKFLOW_DATA_DIR,
				uri: workflow.dataDirectory,
				children: [
					{ label: SCRIPTED_IP_WORKFLOW_PLAN_FILE, uri: workflow.planFile }
				]
			},
			{
				label: SCRIPTED_IP_WORKFLOW_FIXTURES_DIR,
				uri: workflow.fixturesDirectory,
				children: [
					{
						label: SCRIPTED_IP_WORKFLOW_FIXTURES_CURRENT_DIR,
						uri: workflow.currentFixturesDirectory,
						children: [
							{ label: SCRIPTED_IP_WORKFLOW_FIXTURE_MANIFEST_FILE, uri: workflow.fixtureManifestFile },
							...SCRIPTED_IP_FIXTURE_IP_IMAGE_FILES.map(filename => ({ label: filename, uri: URI.joinPath(workflow.currentFixturesDirectory, filename) })),
							...SCRIPTED_IP_FIXTURE_FINAL_IMAGE_FILES.map(filename => ({ label: filename, uri: URI.joinPath(workflow.currentFixturesDirectory, filename) }))
						]
					}
				]
			},
			{
				label: SCRIPTED_IP_WORKFLOW_ASSETS_DIR,
				uri: workflow.assetsDirectory,
				children: [
					{ label: SCRIPTED_IP_WORKFLOW_ASSET_NOTES_FILE, uri: workflow.assetNotesFile }
				]
			}
		];

		if (launcherFile) {
			children.push({ label: SCRIPTED_IP_LAUNCHER_FILE, uri: launcherFile });
		}

		return {
			label: workflow.targetDirectory.path.split('/').at(-1) ?? SCRIPTED_IP_WORKFLOW_DIR,
			uri: workflow.targetDirectory,
			children
		};
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
