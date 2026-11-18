/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { mainWindow } from '../../../../../base/browser/window.js';
import { raceCancellation, raceTimeout, ResourceQueue, timeout } from '../../../../../base/common/async.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { CancellationError } from '../../../../../base/common/errors.js';
import { hashAsync } from '../../../../../base/common/hash.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../../base/common/map.js';
import { Schemas } from '../../../../../base/common/network.js';
import { join } from '../../../../../base/common/path.js';
import { isNative } from '../../../../../base/common/platform.js';
import { URI } from '../../../../../base/common/uri.js';
import { generateUuid } from '../../../../../base/common/uuid.js';
import { getCodeEditor, ICodeEditor } from '../../../../../editor/browser/editorBrowser.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { ITextModel } from '../../../../../editor/common/model.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { InstantiationType, registerSingleton } from '../../../../../platform/instantiation/common/extensions.js';
import { createDecorator, IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { INativeHostService } from '../../../../../platform/native/common/native.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { IWorkspaceTrustManagementService } from '../../../../../platform/workspace/common/workspaceTrust.js';
import { ACTIVE_GROUP, IEditorService } from '../../../../services/editor/common/editorService.js';
import { IWorkbenchEnvironmentService } from '../../../../services/environment/common/environmentService.js';
import { IWebviewService, WebviewInitInfo } from '../../../webview/browser/webview.js';
import { asWebviewUri, webviewGenericCspSource } from '../../../webview/common/webview.js';
import { WebviewInput } from '../../../webviewPanel/browser/webviewEditorInput.js';
import { IWebviewWorkbenchService } from '../../../webviewPanel/browser/webviewWorkbenchService.js';
import { ChatQuestionCarouselData } from '../../common/model/chatProgressTypes/chatQuestionCarouselData.js';
import { IChatAgentRequest } from '../../common/participants/chatAgents.js';
import { IChatProgress } from '../../common/chatService/chatService.js';


const DETAIL_IMAGE_DEMO_FILES = [
	'index.html', 'styles.css', 'app.js', 'start-preview.bat',
	'assets/ring-v1/style-1.png', 'assets/ring-v1/style-2.png', 'assets/ring-v1/style-3.png',
	'assets/ring-v1/detail-1.png', 'assets/ring-v1/detail-2.png', 'assets/ring-v1/detail-3.png',
	'assets/ring-v1/detail-4.png', 'assets/ring-v1/detail-5.png', 'assets/ring-v1/detail-6.png',
] as const;
// Fingerprints of the original generated files, normalized to LF.
const DETAIL_IMAGE_DEMO_ORIGINAL: Partial<Record<typeof DETAIL_IMAGE_DEMO_FILES[number], readonly string[]>> = {
	'index.html': ['6df406a5c9ada33afc7194f48f30eb119eb6da1d', 'a39e407f42b2ff923d372fd6e7d40940b1956f05', 'e7d0f03f9baae9965289fb7af17dfeb347511f4b', '129788769cd3720e2a833a388cb939c72f42de20', '52e10a688209cf86d96476032e1732fe53167ac4', '9651c3e775baf5ead9099757a4760379cb4c7d49', '9e93e002462a577a13e53a3f1bdb3626084d70d9', '73b60c744e5b1527c043df69a353faad9259c63a', 'bb0b128a3044042febf680549fe812321f8cf491', 'b4ea46ef8efa141f3e4160ec18b905b72bd15b62', 'cd7aa5710633d65adeec1011dc82c7bf10a6be28', 'b12cc8228a2c64892659d20c5c0b25fc6133437a', 'bcab114d0da3c5b7aafca52f68b2e445dc666c51'],
	'styles.css': ['984ad8e2b196600696e0d8c28b8d0125dcb9c17f', '6900c1de5d3ade7604e4cff0889ef90b6fa00001', '929bb50887eaeeb6d50f007cc2420ad388cadc1c', '9bda79721b4611886a9b61a3f6e5196749edab14', '8fd236d207f320115b35b1dbf958ed84b1452bc6', '4c4f39e93358bca24b6e76d2cfd94c75adb02d9d', '5b5bb0cab8ffbaa4b3e7866f7df3f35f686f46f2', 'd47dea32c497530213b133b8da7c9cb07c8fb0fb', '40e878bfd42349219d0490a6e20f433bf4065079', '8daa9e0549f8ac3756f6886783fb408fae318dc9'],
	'start-preview.bat': ['d87800fa73fa1d8848b75b7e8b7c74eb10800b32'],
	'app.js': ['3793eadfc43c84a257c52bb2c8604100411dc4d2', '0e098ff63a808b8f86f370da486fd56f8298be39', 'a34b7e00ef09f28eff2dff668f4e8b19611fbc5f', 'ced0676fafb09aee17b46602860d78346b3db18a', 'e81eff172acbacd53595190d7ed67141aff2ee53', '5940e4e28757bc4c25816dcd8e35343418db1b4d', '53cd5665839ecab72c6d87ce076b9a96cd2ec5ff', '47dc090dc1360fa3d4820799a15ee05e922c5a4b', '3896450410a0304f70a7ae52ef33b9d7c38afaa2', '858d7487c886f5ba5a55114b62eb1a3fb0e82938', 'd4570ef6012354020ea9df574c17d753480dd3fb', '94fb47634d83bd946598d94ae5017f1d8972a87e', '42d18d0ed9cb98628a3a43b28e2e876192fe17d4', '7c3704b9b17c6eac99924f625d74d0295821c2d5', 'd8d37a45c69913cfbb49db4e270047f7a18ecc24', '45315e1cad448b82357735b9cb68a820db75d3b5', '3a51bcb38d3d31fae4e5e351ccfccb757ab1e5eb'],
};

const questions: readonly { area: string; intro: string; prompt: string; options: Record<string, string> }[] = [
	{
		area: '用户流程',
		intro: '先确定 V1 要替用户完成哪一段工作，再安排页面和操作步骤。',
		prompt: 'V1 的流程要做到哪一步？',
		options: {
			'从上传商品图到批量出图': '实现商品图与商品信息录入、选择风格、排版和批量出图。验收时能从一张白底商品图走到一组可预览的详情图。',
			'从上传到单张修改和导出': '打通上传、风格、排版和批量出图，并提供单张重新生成和 PNG 下载。验收时修改一张图，其他成图保持原样。',
		},
	},
	{
		area: '生成内容',
		intro: '再确定 V1 要产出哪些内容，以及哪些内容需要支持手动修改。',
		prompt: '除了最终图片，V1 需要交付哪些生成内容？',
		options: {
			'每张图的生图提示词和图上文案': '为每张详情图提供独立的生图提示词和图上文案。模板优化参考商品信息生成初稿，两栏都可以继续编辑，并与对应成图并排显示。',
			'风格候选和逐图可编辑内容': '在出图前提供多张风格候选供比较，也支持上传风格参考。为每张详情图提供可编辑的生图提示词、图上文案和成图预览。',
		},
	},
	{
		area: '技术实现',
		intro: '最后确定 V1 的运行环境和交付形式，方便现场打开原型。',
		prompt: 'V1 应该以什么形式交付？',
		options: {
			'在 VS Code 内打开的本地原型': '使用本地静态页面和内置的演示素材实现 V1，无需配置生图 API。生成后在 VS Code 编辑区直接打开可操作的预览。',
			'VS Code 预览和可独立运行的网页': '使用本地静态页面和内置的演示素材实现 V1。除了 VS Code 预览，交付包含素材和配置的页面目录，可用浏览器直接打开。',
		},
	},
];

type DemoVersion = 1 | 2;
interface DemoConfig {
	readonly demo: 'product-detail-images';
	readonly id: string;
	readonly version: DemoVersion;
}

interface DemoSession {
	readonly target: URI;
	version?: DemoVersion;
	preview?: WebviewInput;
}

interface AuditResult {
	readonly checks: string[];
	readonly error?: string;
}

export const IDetailImageDemo = createDecorator<IDetailImageDemo>('detailImageDemo');

export interface IDetailImageDemo {
	readonly _serviceBrand: undefined;
	handleRequest(request: IChatAgentRequest, progress: (part: IChatProgress) => void, token: CancellationToken): Promise<boolean>;
}

class DetailImageDemo extends Disposable implements IDetailImageDemo {
	declare readonly _serviceBrand: undefined;

	private readonly sessions = new ResourceMap<DemoSession>();
	private readonly queue = this._register(new ResourceQueue());

	constructor(
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IFileService private readonly fileService: IFileService,
		@ILogService private readonly logService: ILogService,
		@IWorkspaceContextService private readonly workspaceContextService: IWorkspaceContextService,
		@IWorkspaceTrustManagementService private readonly trustService: IWorkspaceTrustManagementService,
		@IWorkbenchEnvironmentService private readonly environmentService: IWorkbenchEnvironmentService,
		@IEditorService private readonly editorService: IEditorService,
		@IModelService private readonly modelService: IModelService,
		@ILanguageService private readonly languageService: ILanguageService,
		@IWebviewService private readonly webviewService: IWebviewService,
		@IWebviewWorkbenchService private readonly webviewWorkbenchService: IWebviewWorkbenchService,
	) {
		super();
	}

	async handleRequest(request: IChatAgentRequest, progress: (part: IChatProgress) => void, token: CancellationToken): Promise<boolean> {
		const message = request.message.normalize('NFKC').trim();
		const started = message.includes('详情图');
		let session = this.sessions.get(request.sessionResource);
		if (!started && !session) {
			return false;
		}

		const report = (value: string | MarkdownString) => this.stream(value, progress, token);
		const pending = (value: string) => progress({ kind: 'progressMessage', content: new MarkdownString(value), shimmer: true });
		const folder = this.workspaceContextService.getWorkspace().folders[0];
		if (!isNative || !folder || folder.uri.scheme !== 'file') {
			await report('请在桌面版 VS Code 中打开一个本地文件夹，再发起详情图演示。');
			return true;
		}
		if (!this.trustService.isWorkspaceTrusted()) {
			await report('请将当前文件夹设为受信任工作区，然后重新发送消息。');
			return true;
		}

		const target = URI.joinPath(folder.uri, 'detail-image-demo');
		try {
			if (!session || session.target.toString() !== target.toString()) {
				if (!started) {
					await report('工作区已切换。请发送包含「详情图」的消息重新开始。');
					return true;
				}
				try {
					await this.instantiationService.invokeFunction(accessor => accessor.get(INativeHostService)).maximizeWindow();
				} catch (error) {
					this.logService.warn('[detail image demo] Could not maximize the window', error);
				}
				const requirements: string[] = [];
				for (const [index, question] of questions.entries()) {
					await report(question.intro + '\n\n');
					const title = '第 ' + (index + 1) + ' 轮 · ' + question.area;
					const answer = await this.choose(title, question.prompt, Object.keys(question.options), progress, token);
					requirements.push(question.options[answer]);
				}
				session = { target };
				this.sessions.set(request.sessionResource, session);
				await report(this.plan(requirements));
				const decision = await this.choose('实施计划确认', '是否按上面的计划生成 V1？', ['确认执行', '暂缓执行'], progress, token);
				if (decision !== '确认执行') {
					await report('计划已暂缓。准备好后可回复「确认执行」。');
					return true;
				}
			} else if (!session.version && (!message.includes('确认执行') || /不确认|不执行|暂缓|先别|不要|暂不/.test(message))) {
				await report('计划已准备好。请回复「确认执行」以生成并打开 V1。');
				return true;
			}

			const current = session;
			await this.queue.queueFor(target, async () => {
				if (token.isCancellationRequested) {
					return;
				}
				if (!current.version) {
					await this.buildV1(current, report, pending, token);
					await report('**V1 已生成并打开。** 可以在「商品详情图 · V1」标签页上传白底商品图，从商品名称开始测试。');
					return;
				}

				const audit = /自审|审核|自检|打包|压缩包/i.test(message);
				if (audit) {
					if (current.version !== 2) {
						await report('请先完成 V2 修复，再提交自审和打包要求。');
						return;
					}
					await report('我会在独立页面验证 V2。你可以继续操作旁边已经打开的预览。\n\n');
					pending('正在审核上传、风格、排版、出图和 PNG 下载…');
					const result = await this.audit(current.target, token);
					if (result.error || !result.checks.length) {
						await report(new MarkdownString('**自审发现问题**\n\n').appendText(result.error ?? '审核没有返回有效结果。'));
						return;
					}
					pending('自审检查通过，正在生成 ZIP…');
					const zip = await this.package(current.target, result.checks);
					const summary = new MarkdownString('**审核完成，已验证的功能符合要求。**\n\n');
					for (const check of result.checks) {
						summary.appendMarkdown('- ').appendText(check).appendMarkdown('\n');
					}
					summary.appendMarkdown('\n').appendLink(zip, '商品详情图 V2 离线压缩包').appendMarkdown('\n\n');
					summary.appendText('压缩包已保存到 ' + zip.fsPath + '。复制到其他 Windows 电脑，解压后双击 start-preview.bat 即可使用。');
					await report(summary);
					return;
				}

				if (message.includes('4096')) {
					await report('我会在上传阶段统一处理商品图和风格参考图。超过限制的图片会按原比例缩放，再交给出图流程。\n\n');
					pending('正在写入 V2 的图片预处理逻辑…');
					await this.streamV2Code(token);
					await this.publish(current, 2);
					await report('**V2 已生成并打开。** 商品图和风格参考图会在上传后等比缩到长边 2048 像素以内。可以重新上传原图验证。');
					return;
				}

				await report(current.version === 1
					? '你可以继续测试 V1。遇到图片尺寸错误时，请在这里发回报错信息和修改要求。'
					: 'V2 已就绪。测试后可回复「自审并打包」生成离线压缩包。');
			});
		} catch (error) {
			if (token.isCancellationRequested) {
				return true;
			}
			this.logService.error('[detail image demo]', error);
			const detail = error instanceof Error ? error.message : String(error);
			await report(new MarkdownString('当前步骤未完成。\n\n').appendText(detail));
		}
		return true;
	}

	private async stream(value: string | MarkdownString, progress: (part: IChatProgress) => void, token: CancellationToken): Promise<void> {
		const characters = Array.from(typeof value === 'string' ? value : value.value);
		const chunkSize = 4;
		for (let offset = 0; offset < characters.length; offset += chunkSize) {
			if (token.isCancellationRequested) {
				throw new CancellationError();
			}
			progress({ kind: 'markdownContent', content: new MarkdownString(characters.slice(offset, offset + chunkSize).join('')) });
			if (offset + chunkSize < characters.length) {
				await timeout(95, token);
			}
		}
	}

	private async choose(title: string, message: string, choices: readonly string[], progress: (part: IChatProgress) => void, token: CancellationToken): Promise<string> {
		const id = generateUuid();
		const carousel = new ChatQuestionCarouselData([{
			id,
			title,
			type: 'singleSelect',
			message,
			options: choices.map(choice => ({ id: choice, label: choice, value: choice })),
			allowFreeformInput: false,
			required: true,
		}], false, generateUuid());
		progress(carousel);
		const response = await raceCancellation(carousel.completion.p, token);
		const answer = response?.answers?.[id];
		const selection = typeof answer === 'string' ? answer : answer && 'selectedValue' in answer ? answer.selectedValue : undefined;
		if (token.isCancellationRequested) {
			throw new CancellationError();
		}
		if (!selection || !choices.includes(selection)) {
			throw new Error('没有收到选项结果。请在聊天选项卡中选择并提交。');
		}
		return selection;
	}

	private async buildV1(session: DemoSession, report: (message: string) => Promise<void>, pending: (message: string) => void, token: CancellationToken): Promise<void> {
		pending('正在读取工作台模板…');
		const [html, css, app] = await Promise.all(['index.html', 'styles.css', 'app.js'].map(async file =>
			(await this.fileService.readFile(URI.joinPath(this.source, file))).value.toString().replace(/\r\n/g, '\n')));
		const templateStart = app.indexOf('\nfunction option(') + 1;
		const renderStart = app.indexOf('\nfunction wrapLines(') + 1;
		if (!templateStart || renderStart <= templateStart) {
			throw new Error('内置工作台模板缺少模板编辑或出图代码。');
		}

		await report('**开始搭建 V1**\n\n我先把商品图、选风格、排版与出图做成三个步骤，再把上传和出图操作接进去。\n\n');
		pending('正在编写页面结构 · index.html');
		await this.appendCode(await this.openCodeEditor(1, 'index.html', 'html'), html, 6500, token);

		await report('三个步骤的页面结构已展开。现在补上桌面布局，让每张图的提示词和文案与右侧预览一一对应。\n\n');
		pending('正在排版页面 · styles.css');
		await this.appendCode(await this.openCodeEditor(1, 'styles.css', 'css'), css, 6500, token);

		await report('**接通商品图和风格选择**\n\n接下来写上传校验、商品图预览和步骤切换。风格既可以从候选里选，也可以上传参考图。\n\n');
		pending('正在编写上传与风格逻辑 · app.js');
		const editor = await this.openCodeEditor(1, 'app.js', 'javascript');
		await this.appendCode(editor, app.slice(0, templateStart), 12000, token);

		await report('**接通模板和文案编辑**\n\n载入预设时设置张数和比例。点击模板优化才会填入提示词和图上文案，两项都可以继续编辑。\n\n');
		pending('正在编写模板与逐图编辑逻辑 · app.js');
		await this.appendCode(editor, app.slice(templateStart, renderStart), 11000, token);

		await report('**接通出图和下载**\n\n把批量出图、单张重新生成和 PNG 下载接到每一行，更新单张时保留其余结果。\n\n');
		pending('正在编写出图、下载与页面初始化逻辑 · app.js');
		await this.appendCode(editor, app.slice(renderStart), 16000, token);

		await report('代码已展开，正在将页面、素材和运行配置写入工作区。预览页初始化后就可以开始测试。\n\n');
		pending('正在写入文件并启动 V1 预览…');
		await this.publish(session, 1);
	}

	private async streamV2Code(token: CancellationToken): Promise<void> {
		const app = (await this.fileService.readFile(URI.joinPath(this.source, 'app.js'))).value.toString();
		const excerpt = /async function prepareImage\([\s\S]*?(?=\nfunction showImage)/.exec(app)?.[0].trimEnd();
		await this.appendCode(await this.openCodeEditor(2, 'app.js', 'javascript'), excerpt ?? app, 1800, token);
	}

	private async openCodeEditor(version: DemoVersion, filename: string, language: string) {
		const resource = URI.from({ scheme: Schemas.inMemory, authority: generateUuid(), path: '/' + filename });
		const model = this.modelService.createModel('', this.languageService.createById(language), resource);
		const pane = await this.editorService.openEditor({ resource, label: 'V' + version + ' · ' + filename, options: { pinned: true, preserveFocus: true } });
		if (!pane) {
			model.dispose();
			throw new Error('无法打开代码编辑区。');
		}
		return { model, editor: getCodeEditor(pane.getControl()) };
	}

	private async appendCode({ model, editor }: { model: ITextModel; editor: ICodeEditor | null }, source: string, duration: number, token: CancellationToken): Promise<void> {
		const lines = source.replace(/\r\n/g, '\n').match(/[^\n]*\n|[^\n]+$/g) ?? [];
		const chunkSize = Math.max(1, Math.ceil(lines.length / (duration / 175)));
		const start = performance.now();
		for (let offset = 0; offset < lines.length; offset += chunkSize) {
			if (token.isCancellationRequested) {
				throw new CancellationError();
			}
			const end = Math.min(offset + chunkSize, lines.length);
			if (!model.isDisposed()) {
				model.applyEdits([{ range: model.getFullModelRange().collapseToEnd(), text: lines.slice(offset, end).join('') }]);
				if (editor?.getModel() === model) {
					editor.revealLineInCenter(model.getLineCount());
				}
			}
			const next = start + duration * end / lines.length;
			await timeout(Math.max(0, next - performance.now()), token);
		}
	}

	private plan(requirements: string[]): MarkdownString {
		const plan = new MarkdownString('**V1 实施计划 · 商品详情图工作台**\n\n');
		for (const [index, question] of questions.entries()) {
			plan.appendMarkdown('- **' + question.area + '** ' + requirements[index] + '\n');
		}
		plan.appendMarkdown('\n在下方选择 **确认执行** 后，我会生成并打开 V1。');
		return plan;
	}

	private get source(): URI {
		const appRoot = (this.environmentService as IWorkbenchEnvironmentService & { appRoot: string }).appRoot;
		return URI.file(join(appRoot, 'resources', 'chat-templates', 'detail-image-demo'));
	}

	private async readConfig(target: URI): Promise<DemoConfig | undefined> {
		const resource = URI.joinPath(target, 'demo.json');
		if (!await this.fileService.exists(resource)) {
			return undefined;
		}
		const config = JSON.parse((await this.fileService.readFile(resource)).value.toString());
		if (config?.demo !== 'product-detail-images' || typeof config.id !== 'string' || (config.version !== 1 && config.version !== 2)) {
			throw new Error('现有 detail-image-demo 配置无法识别。请使用另一处本地工作区。');
		}
		return config;
	}

	private async publish(session: DemoSession, version: DemoVersion): Promise<void> {
		const { target } = session;
		const current = await this.readConfig(target);
		const files = await Promise.all(DETAIL_IMAGE_DEMO_FILES.map(async name => {
			const destination = URI.joinPath(target, name);
			const content = await this.fileService.readFile(URI.joinPath(this.source, name));
			const existing = await this.fileService.exists(destination) ? await this.fileService.readFile(destination) : undefined;
			const originals = DETAIL_IMAGE_DEMO_ORIGINAL[name];
			const differs = !!existing && !existing.value.equals(content.value);
			const generated = !differs || !!originals?.includes(await hashAsync(existing.value.toString().replace(/\r\n/g, '\n')));
			return { destination, content, existing, differs, generated, originals };
		}));
		if (!current && files.some(file => file.differs)) {
			throw new Error('工作区已有同名演示文件。请使用另一处本地工作区。');
		}

		const refresh = files.every(file => !file.originals || file.generated);
		for (const { destination, content, existing, differs, originals } of files) {
			if (!existing) {
				await this.fileService.createFile(destination, content.value);
			} else if (refresh && differs && originals) {
				await this.fileService.writeFile(destination, content.value, { etag: existing.etag, mtime: existing.mtime, atomic: { postfix: '.tmp' } });
			}
		}
		const oldSample = URI.joinPath(target, 'silver-ring.webp');
		if (refresh && await this.fileService.exists(oldSample)) {
			const sample = await this.fileService.readFile(oldSample);
			if (await hashAsync(sample.value) === '2c198b42cffa21563ceaa2059c47916cb5f7b1e9') {
				await this.fileService.del(oldSample);
			}
		}

		const config: DemoConfig = { demo: 'product-detail-images', id: current?.id ?? generateUuid(), version };
		const json = JSON.stringify(config);
		await this.fileService.writeFile(URI.joinPath(target, 'demo.json'), VSBuffer.fromString(json + '\n'), { atomic: { postfix: '.tmp' } });
		await this.fileService.writeFile(URI.joinPath(target, 'demo-config.js'), VSBuffer.fromString('globalThis.detailImageDemoConfig = ' + json + ';\n'), { atomic: { postfix: '.tmp' } });
		await this.openPreview(session, config);
		session.version = version;
	}

	private viewOptions(target: URI, title: string): WebviewInitInfo {
		return {
			providedViewType: 'workbench.detailImageDemo',
			title,
			options: { retainContextWhenHidden: true },
			contentOptions: { allowScripts: true, localResourceRoots: [target, this.source] },
			extension: undefined,
		};
	}

	private async html(target: URI, config: DemoConfig, audit = false): Promise<string> {
		const { value } = await this.fileService.readFile(URI.joinPath(target, 'index.html'));
		const base = asWebviewUri(target);
		const origin = webviewGenericCspSource;
		const nonce = generateUuid();
		const head = [
			'<head>',
			`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src ${origin} 'nonce-${nonce}'; style-src ${origin} 'unsafe-inline'; img-src ${origin} blob: data:; connect-src ${origin} blob:; base-uri ${origin}">`,
			`<base href="${base.toString()}/">`,
			`<script nonce="${nonce}">globalThis.detailImageDemoConfig = ${JSON.stringify({ demo: config.demo, version: config.version })};</script>`,
			audit
				? `<script src="${asWebviewUri(URI.joinPath(this.source, 'audit.js')).toString()}" defer></script>`
				: `<script nonce="${nonce}">const vscode = acquireVsCodeApi(); window.addEventListener('detail-image-ready', () => vscode.postMessage({ type: 'detail-image-ready' }), { once: true });</script>`,
		].join('\n');
		return value.toString().replace('<head>', head).replace(/<script src="demo-config\.js" defer><\/script>/, '');
	}

	private async openPreview(session: DemoSession, config: DemoConfig): Promise<void> {
		const html = await this.html(session.target, config);
		const title = '商品详情图 · V' + config.version;
		if (session.preview && !session.preview.isDisposed()) {
			session.preview.setWebviewTitle(title);
			this.webviewWorkbenchService.revealWebview(session.preview, session.preview.group ?? ACTIVE_GROUP, false);
		} else {
			session.preview = this.webviewWorkbenchService.openWebview(this.viewOptions(session.target, title), 'workbench.detailImageDemo', title, undefined, {});
		}
		const view = session.preview.webview;
		const listeners = new DisposableStore();
		try {
			const loaded = new Promise<boolean>(resolve => {
				listeners.add(view.onMessage(({ message }) => {
					if (message?.type === 'detail-image-ready') {
						resolve(true);
					}
				}));
				listeners.add(view.onFatalError(() => resolve(false)));
				listeners.add(view.onDidDispose(() => resolve(false)));
			});
			view.setHtml(html);
			if (!await raceTimeout(loaded, 15000)) {
				throw new Error('工作台文件已生成，但 VS Code 预览未能加载。可重新执行当前步骤。');
			}
		} finally {
			listeners.dispose();
		}
	}

	private async audit(target: URI, token: CancellationToken): Promise<AuditResult> {
		const config = await this.readConfig(target);
		if (config?.version !== 2) {
			throw new Error('当前工作区尚未生成 V2。请先验证大图上传修复。');
		}
		const html = await this.html(target, config, true);
		const mount = mainWindow.document.createElement('div');
		mount.setAttribute('aria-hidden', 'true');
		mount.inert = true;
		mount.style.cssText = 'position:fixed;left:-10000px;top:0;width:1920px;height:1080px;pointer-events:none';
		mainWindow.document.body.append(mount);
		const view = this.webviewService.createWebviewElement(this.viewOptions(target, '详情图 V2 自审'));
		try {
			const result = new Promise<AuditResult>(resolve => {
				view.onMessage(({ message }) => {
					if (message?.type === 'detail-image-audit' && Array.isArray(message.checks)) {
						resolve({ checks: message.checks, error: message.error });
					}
				});
				view.onFatalError(({ message }) => resolve({ checks: [], error: message }));
			});
			view.mountTo(mount, mainWindow);
			view.setHtml(html);
			return await raceCancellation(raceTimeout(result, 90000), token) ?? { checks: [], error: '页面自审超时。可重新发送「自审并打包」。' };
		} finally {
			view.dispose();
			mount.remove();
		}
	}

	private async package(target: URI, checks: string[]): Promise<URI> {
		const files = await Promise.all([...DETAIL_IMAGE_DEMO_FILES, 'demo.json', 'demo-config.js'].map(async (path): Promise<[string, VSBuffer]> => [
			path,
			(await this.fileService.readFile(URI.joinPath(target, path))).value,
		]));
		const instructions = [
			'商品详情图 V2',
			'',
			'解压整个压缩包。Windows 上双击 start-preview.bat，或用浏览器打开 index.html。',
			'本地素材随包提供，可以离线使用。',
			'',
			'自审记录',
			...checks.map(check => '- ' + check),
			'',
		].join('\r\n');
		const suffix = generateUuid().slice(0, 8);
		const zip = URI.joinPath(target, '商品详情图-V2-' + suffix + '.zip');
		const temporary = URI.joinPath(target, '.detail-image-' + suffix + '.tmp');
		const native = this.instantiationService.invokeFunction(accessor => accessor.get(INativeHostService));
		try {
			await native.createZipFile(temporary, [{ path: '使用说明.txt', contents: '\ufeff' + instructions }], files);
			await this.fileService.move(temporary, zip);
			return zip;
		} finally {
			if (await this.fileService.exists(temporary)) {
				await this.fileService.del(temporary);
			}
		}
	}
}

registerSingleton(IDetailImageDemo, DetailImageDemo, InstantiationType.Delayed);
