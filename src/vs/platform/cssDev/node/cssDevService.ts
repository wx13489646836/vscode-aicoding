/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { spawn } from 'child_process';
import { readdir } from 'fs/promises';
import { join, relative } from '../../../base/common/path.js';
import { FileAccess } from '../../../base/common/network.js';
import { StopWatch } from '../../../base/common/stopwatch.js';
import { IEnvironmentService } from '../../environment/common/environment.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { ILogService } from '../../log/common/log.js';

export const ICSSDevelopmentService = createDecorator<ICSSDevelopmentService>('ICSSDevelopmentService');

export interface ICSSDevelopmentService {
	_serviceBrand: undefined;
	isEnabled: boolean;
	getCssModules(): Promise<string[]>;
}

export class CSSDevelopmentService implements ICSSDevelopmentService {

	declare _serviceBrand: undefined;

	private _cssModules?: Promise<string[]>;

	constructor(
		@IEnvironmentService private readonly envService: IEnvironmentService,
		@ILogService private readonly logService: ILogService
	) { }

	get isEnabled(): boolean {
		return !this.envService.isBuilt;
	}

	getCssModules(): Promise<string[]> {
		this._cssModules ??= this.computeCssModules();
		return this._cssModules;
	}

	private async computeCssModules(): Promise<string[]> {
		if (!this.isEnabled) {
			return [];
		}

		const sw = StopWatch.create();
		const basePath = FileAccess.asFileUri('').fsPath;

		try {
			const rg = await import('@vscode/ripgrep');
			const result = await new Promise<string[] | undefined>((resolve) => {
				const chunks: Buffer[] = [];
				let failed = false;
				const process = spawn(rg.rgPath, ['-g', '**/*.css', '--files', '--no-ignore', basePath], {});

				process.stdout.on('data', data => {
					chunks.push(data);
				});
				process.on('error', err => {
					failed = true;
					this.logService.error('[CSS_DEV] FAILED to compute CSS data via ripgrep', err);
					resolve(undefined);
				});
				process.on('close', code => {
					if (failed) {
						return;
					}

					if (code !== 0) {
						this.logService.error(`[CSS_DEV] ripgrep exited with code ${code}, falling back to filesystem scan.`);
						resolve(undefined);
						return;
					}

					const data = Buffer.concat(chunks).toString('utf8');
					resolve(this.parseCssModules(basePath, data));
				});
			});

			if (result) {
				this.logService.info(`[CSS_DEV] DONE, ${result.length} css modules (${Math.round(sw.elapsed())}ms)`);
				return result;
			}
		} catch (error) {
			this.logService.error('[CSS_DEV] FAILED to initialize ripgrep, falling back to filesystem scan.', error);
		}

		const result = await this.scanCssModulesFromFilesystem(basePath);
		this.logService.info(`[CSS_DEV] DONE, ${result.length} css modules from filesystem scan (${Math.round(sw.elapsed())}ms)`);
		return result;
	}

	private parseCssModules(basePath: string, data: string): string[] {
		const result = data
			.split('\n')
			.filter(Boolean)
			.map(path => relative(basePath, path).replace(/\\/g, '/'))
			.filter(Boolean)
			.sort();

		if (result.some(path => path.indexOf('vs/') !== 0)) {
			this.logService.error(`[CSS_DEV] Detected invalid paths in css modules, raw output: ${data}`);
		}

		return result;
	}

	private async scanCssModulesFromFilesystem(basePath: string): Promise<string[]> {
		const result: string[] = [];

		const walk = async (folder: string): Promise<void> => {
			const entries = await readdir(folder, { withFileTypes: true });
			for (const entry of entries) {
				const entryPath = join(folder, entry.name);
				if (entry.isDirectory()) {
					await walk(entryPath);
					continue;
				}

				if (!entry.isFile() || !entry.name.endsWith('.css')) {
					continue;
				}

				const relativePath = relative(basePath, entryPath).replace(/\\/g, '/');
				if (relativePath.startsWith('vs/')) {
					result.push(relativePath);
				}
			}
		};

		await walk(join(basePath, 'vs'));
		result.sort();

		return result;
	}
}
