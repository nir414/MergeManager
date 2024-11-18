const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');
const chalk = require('chalk');

// 콘솔 인터페이스 설정
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

let isDebugMode = true; // 디버깅 모드 플래그

// 디버깅 및 로깅 관련 함수
async function debugLogWithPause(message, data = null) {
	if (!isDebugMode) return;

	const timestamp = new Date().toISOString();
	const stack = new Error().stack;
	const callerLine = stack.split('\n')[2];
	const lineInfo = callerLine.trim().replace(/.*\((.*)\)/, '$1');

	console.log(chalk.cyan.bold(`\n[DEBUG - ${timestamp}]`));
	console.log(chalk.yellow.bold(`Message:`), message);
	if (data !== null) {
		console.log(chalk.green.bold(`Data:`), data);
	}
	console.log(chalk.blue.bold(`Location:`), lineInfo);
	console.log(chalk.magenta.bold('Press ENTER to continue...'));

	return new Promise((resolve) => {
		rl.question('', () => resolve());
	});
}

// readline 인터페이스를 안전하게 종료하는 함수
function exitProgram() {
	if (!rl.closed) {
		rl.close(); // readline 인터페이스를 명시적으로 닫아 리소스 해제
	}
	throw new Error('Program terminated by user'); // 프로그램 종료를 위한 에러 던지기
}

// 프로그램의 진입점
(async function main() {
	try {
		displayMenu();
		await handleUserInput();
	} catch (err) {
		if (err.message === 'Program terminated by user') {
			console.log(chalk.red('프로그램이 종료되었습니다.'));
		} else {
			console.error(chalk.red('예기치 못한 오류가 발생했습니다:'), err);
		}
	}
})();

// 메뉴 출력 함수
function displayMenu() {
	console.log(chalk.blue.bold('\n======================================'));
	console.log(chalk.green('Brooks Automation GPL 코드 관리 시스템'));
	console.log(chalk.blue.bold('======================================'));
	console.log(chalk.yellow('1: 통합 코드 분리'));
	console.log(chalk.yellow('2: 모듈 통합'));
	console.log(chalk.red('0: 종료'));
	console.log(chalk.blue.bold('=============================\n'));
}

// 사용자 입력 처리 함수
async function handleUserInput() {
	while (true) {
		const answer = await new Promise((resolve) => {
			rl.question(chalk.cyan('수행할 작업을 선택하세요 (1/2/0): '), resolve);
		});

		switch (answer) {
			case '1':
				console.log(chalk.green('통합 코드 분리 작업을 시작합니다...'));
				await splitModules();
				break;
			case '2':
				console.log(chalk.green('모듈 통합 작업을 시작합니다...'));
				await mergeModules();
				break;
			case '0':
				console.log(chalk.red('프로그램을 종료합니다.'));
				exitProgram();
				break;
			default:
				console.log(chalk.red('잘못된 선택입니다. 다시 시도해주세요.'));
		}
	}
}

// 파일 선택 프롬프트
async function promptFileSelection() {
	const files = await fs.readdir(process.cwd());
	const gplFiles = files.filter(file => file.endsWith('.gpl'));

	if (gplFiles.length === 0) {
		console.log(chalk.red('.gpl 파일이 현재 디렉토리에 없습니다.'));
		exitProgram();
	}

	console.log(chalk.blue('\n현재 디렉토리에서 찾은 .gpl 파일 목록:'));
	gplFiles.forEach((file, index) => {
		console.log(chalk.yellow(`${index + 1}: ${file}`));
	});

	const answer = await new Promise((resolve) => {
		rl.question(chalk.cyan('사용할 파일 번호를 선택하세요: '), resolve);
	});

	const index = parseInt(answer) - 1;
	if (isNaN(index) || index < 0 || index >= gplFiles.length) {
		console.log(chalk.red('유효하지 않은 선택입니다.'));
		exitProgram();
	}
	return path.join(process.cwd(), gplFiles[index]);
}

// 디렉토리 확인 및 생성
async function ensureDirectoryExists(directory) {
	try {
		if (!await fs.access(directory).then(() => true).catch(() => false)) {
			await fs.mkdir(directory);
		}
	} catch (err) {
		console.error(chalk.red(`Failed to create directory: ${directory}`), err);
		throw err;
	}
}

// 안전한 파일 읽기
async function readFileSafe(filePath, encoding = 'utf8') {
	try {
		return await fs.readFile(filePath, encoding);
	} catch (err) {
		if (err.code !== 'ENOENT') {
			console.error(chalk.red(`Error reading file: ${filePath}`), err);
			throw err;
		}
		return null;
	}
}

// 안전한 파일 쓰기
async function writeFileSafe(filePath, content) {
	try {
		await fs.writeFile(filePath, content, 'utf8');
	} catch (err) {
		console.error(chalk.red(`Error writing file: ${filePath}`), err);
		throw err;
	}
}

// 모듈 분리 작업
async function splitModules() {
	const inputFilePath = await promptFileSelection();
	const outputDirectory = './SplitGplModules';
	const projectFilePath = path.join(outputDirectory, 'Project.gpr');

	const projectManager = new ProjectFileManager(projectFilePath);
	await projectManager.loadProjectFile();
	await ensureDirectoryExists(outputDirectory);

	const data = await readFileSafe(inputFilePath);
	if (!data) {
		console.log(chalk.red('Error reading input file.'));
		return;
	}

	const moduleRegex = /((?:'[^\n]*\n)+)?(Module \w+[\s\S]*?End Module)/g;
	let match;
	while ((match = moduleRegex.exec(data)) !== null) {
		const comments = match[1] || '';
		const moduleContent = match[2];
		const fullContent = comments + moduleContent;

		const moduleNameMatch = moduleContent.match(/Module (\w+)/);
		const moduleName = moduleNameMatch ? moduleNameMatch[1] : 'UnknownModule';
		const moduleFileName = `${moduleName}.gpl`;

		const outputFilePath = path.join(outputDirectory, moduleFileName);
		await writeFileSafe(outputFilePath, fullContent);
		projectManager.addModule(moduleFileName);
	}
	await projectManager.saveProjectFile();
}

// 모듈 통합 작업
async function mergeModules() {
	const outputDirectory = './SplitGplModules';
	const projectFilePath = path.join(outputDirectory, 'Project.gpr');
	const mergeOutputDirectory = './MergeCode';
	const mergedFilePath = path.join(mergeOutputDirectory, 'MergeCode.gpl');
	const mergedProjectFilePath = path.join(mergeOutputDirectory, 'Project.gpr');

	await ensureDirectoryExists(mergeOutputDirectory);

	const projectData = await readFileSafe(projectFilePath);
	if (!projectData) {
		console.log(chalk.red('Project file not found.'));
		return;
	}

	const lines = projectData.split(/\r?\n/);
	let mergedContent = '';

	for (const line of lines) {
		if (line.startsWith('ProjectSource=')) {
			const moduleFileName = line.split('=')[1].replace(/"/g, '');
			const moduleFilePath = path.join(outputDirectory, moduleFileName);
			const moduleData = await readFileSafe(moduleFilePath);
			if (moduleData) mergedContent += moduleData + '\n';
		}
	}

	await writeFileSafe(mergedFilePath, mergedContent);
	const projectContent = `'${new Date().toISOString()}\nProjectBegin\nProjectName="MergeCode"\nProjectStart="MAIN"\nProjectSource="MergeCode.gpl"\nProjectEnd\n`;
	await writeFileSafe(mergedProjectFilePath, projectContent);
}

// ProjectFileManager 클래스
class ProjectFileManager {
	constructor(filePath, projectName = 'MergeCode', projectStart = 'MAIN') {
		this.filePath = filePath;
		this.projectName = projectName;
		this.projectStart = projectStart;
		this.modules = new Set();
	}

	async loadProjectFile() {
		const data = await readFileSafe(this.filePath);
		if (data) {
			const matches = data.match(/ProjectSource="(.+?\.gpl)"/g) || [];
			matches.forEach(match => {
				const moduleName = match.match(/ProjectSource="(.+?)"/)[1];
				this.modules.add(moduleName);
			});
		}
	}

	addModule(moduleName) {
		this.modules.add(moduleName);
	}

	async saveProjectFile() {
		const timestamp = new Date().toISOString();
		let content = `'${timestamp}\nProjectBegin\nProjectName="${this.projectName}"\nProjectStart="${this.projectStart}"\n`;
		this.modules.forEach(module => {
			content += `ProjectSource="${module}"\n`;
		});
		content += 'ProjectEnd\n';
		await writeFileSafe(this.filePath, content);
	}
}
