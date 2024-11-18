const fs = require('fs').promises; // Promise 기반 파일 시스템 모듈
const path = require('path'); // 경로 관련 유틸리티 모듈
const readline = require('readline'); // 콘솔 입력 인터페이스 제공 모듈
const chalk = require('chalk'); // 콘솔 텍스트 스타일링 모듈

// 콘솔 인터페이스 설정
const rl = readline.createInterface({
	input: process.stdin, // 사용자 입력을 받을 스트림
	output: process.stdout // 출력 스트림
});

let isDebugMode = true; // 디버깅 모드 활성화 여부

// 디버깅 및 로깅 관련 함수
async function debugLogWithPause(message, data = null) {
	if (!isDebugMode) return; // 디버깅 모드가 비활성화된 경우 실행하지 않음

	const timestamp = new Date().toISOString(); // 현재 시간 ISO 형식으로 출력
	const stack = new Error().stack; // 호출 스택 정보 가져오기
	const callerLine = stack.split('\n')[2]; // 호출한 위치의 스택 정보 추출
	const lineInfo = callerLine.trim().replace(/.*\((.*)\)/, '$1'); // 파일과 줄 번호 정보 추출

	// 디버깅 정보 출력
	console.log(chalk.cyan.bold(`\n[DEBUG - ${timestamp}]`));
	console.log(chalk.yellow.bold(`Message:`), message);
	if (data !== null) {
		console.log(chalk.green.bold(`Data:`), data);
	}
	console.log(chalk.blue.bold(`Location:`), lineInfo);
	console.log(chalk.magenta.bold('Press ENTER to continue...'));

	// ENTER 키 대기
	return new Promise((resolve) => {
		rl.question('', () => resolve());
	});
}

// readline 인터페이스를 안전하게 종료하는 함수
function exitProgram() {
	if (!rl.closed) {
		rl.close(); // readline 인터페이스 닫기
	}
	throw new Error('Program terminated by user'); // 프로그램 종료를 나타내는 에러 발생
}

// 프로그램의 진입점
(async function main() {
	try {
		displayMenu(); // 메뉴 출력
		await handleUserInput(); // 사용자 입력 처리
	} catch (err) {
		// 프로그램 종료 에러 처리
		if (err.message === 'Program terminated by user') {
			console.log(chalk.red('프로그램이 종료되었습니다.'));
		} else {
			console.error(chalk.red('예기치 못한 오류가 발생했습니다:'), err);
		}
	}
})();

// 메뉴 출력 함수
function displayMenu() {
	// 프로그램 메뉴 출력
	console.log(chalk.blue.bold('\n======================================'));
	console.log(chalk.green('Brooks Automation GPL 코드 관리 시스템'));
	console.log(chalk.blue.bold('======================================'));
	console.log(chalk.yellow('1: 통합 코드 분리')); // 옵션 1
	console.log(chalk.yellow('2: 모듈 통합')); // 옵션 2
	console.log(chalk.red('0: 종료')); // 종료 옵션
	console.log(chalk.blue.bold('=============================\n'));
}

// 사용자 입력 처리 함수
async function handleUserInput() {
	// 무한 루프를 통해 사용자 입력 반복 처리
	while (true) {
		const answer = await new Promise((resolve) => {
			rl.question(chalk.cyan('수행할 작업을 선택하세요 (1/2/0): '), resolve); // 사용자 입력 대기
		});

		switch (answer) {
			case '1':
				// 모듈 분리 작업 수행
				console.log(chalk.green('통합 코드 분리 작업을 시작합니다...'));
				await splitModules();
				break;
			case '2':
				// 모듈 통합 작업 수행
				console.log(chalk.green('모듈 통합 작업을 시작합니다...'));
				await mergeModules();
				break;
			case '0':
				// 프로그램 종료
				console.log(chalk.red('프로그램을 종료합니다.'));
				exitProgram();
				break;
			default:
				// 잘못된 입력 처리
				console.log(chalk.red('잘못된 선택입니다. 다시 시도해주세요.'));
		}
	}
}

// 파일 선택 프롬프트
async function promptFileSelection() {
	const files = await fs.readdir(process.cwd()); // 현재 디렉토리 파일 목록 가져오기
	const gplFiles = files.filter(file => file.endsWith('.gpl')); // .gpl 파일만 필터링

	if (gplFiles.length === 0) {
		// .gpl 파일이 없으면 종료
		console.log(chalk.red('.gpl 파일이 현재 디렉토리에 없습니다.'));
		exitProgram();
	}

	// 파일 목록 출력
	console.log(chalk.blue('\n현재 디렉토리에서 찾은 .gpl 파일 목록:'));
	gplFiles.forEach((file, index) => {
		console.log(chalk.yellow(`${index + 1}: ${file}`));
	});

	// 사용자로부터 파일 번호 입력받기
	const answer = await new Promise((resolve) => {
		rl.question(chalk.cyan('사용할 파일 번호를 선택하세요: '), resolve);
	});

	const index = parseInt(answer) - 1; // 입력값을 인덱스로 변환
	if (isNaN(index) || index < 0 || index >= gplFiles.length) {
		console.log(chalk.red('유효하지 않은 선택입니다.'));
		exitProgram();
	}
	return path.join(process.cwd(), gplFiles[index]); // 선택한 파일 경로 반환
}

// 디렉토리 확인 및 생성
async function ensureDirectoryExists(directory) {
	try {
		// 디렉토리가 없으면 생성
		if (!await fs.access(directory).then(() => true).catch(() => false)) {
			await fs.mkdir(directory);
		}
	} catch (err) {
		console.error(chalk.red(`Failed to create directory: ${directory}`), err);
		throw err; // 에러 발생 시 상위로 전달
	}
}

// 안전한 파일 읽기
async function readFileSafe(filePath, encoding = 'utf8') {
	try {
		return await fs.readFile(filePath, encoding); // 파일 읽기
	} catch (err) {
		if (err.code !== 'ENOENT') {
			console.error(chalk.red(`Error reading file: ${filePath}`), err);
			throw err; // 예상치 못한 에러 처리
		}
		return null; // 파일이 없으면 null 반환
	}
}

// 안전한 파일 쓰기
async function writeFileSafe(filePath, content) {
	try {
		await fs.writeFile(filePath, content, 'utf8'); // 파일 쓰기
	} catch (err) {
		console.error(chalk.red(`Error writing file: ${filePath}`), err);
		throw err; // 에러 발생 시 상위로 전달
	}
}

// 모듈 분리 작업
async function splitModules() {
	const inputFilePath = await promptFileSelection(); // 분리할 파일 선택
	const outputDirectory = './SplitGplModules'; // 출력 디렉토리
	const projectFilePath = path.join(outputDirectory, 'Project.gpr'); // 프로젝트 파일 경로

	const projectManager = new ProjectFileManager(projectFilePath); // 프로젝트 관리 클래스 생성
	await projectManager.loadProjectFile(); // 기존 프로젝트 파일 로드
	await ensureDirectoryExists(outputDirectory); // 출력 디렉토리 확인 및 생성

	const data = await readFileSafe(inputFilePath); // 입력 파일 읽기
	if (!data) {
		console.log(chalk.red('Error reading input file.'));
		return;
	}

	// 모듈 추출 정규식
	const moduleRegex = /((?:'[^\n]*\n)+)?(Module \w+[\s\S]*?End Module)/g;
	let match;
	while ((match = moduleRegex.exec(data)) !== null) {
		const comments = match[1] || ''; // 주석 부분
		const moduleContent = match[2]; // 모듈 내용
		const fullContent = comments + moduleContent;

		// 모듈 이름 추출
		const moduleNameMatch = moduleContent.match(/Module (\w+)/);
		const moduleName = moduleNameMatch ? moduleNameMatch[1] : 'UnknownModule';
		const moduleFileName = `${moduleName}.gpl`; // 모듈 파일 이름

		const outputFilePath = path.join(outputDirectory, moduleFileName); // 모듈 파일 경로
		await writeFileSafe(outputFilePath, fullContent); // 모듈 내용 저장
		projectManager.addModule(moduleFileName); // 프로젝트 파일에 추가
	}
	await projectManager.saveProjectFile(); // 프로젝트 파일 저장
}

// 모듈 통합 작업
async function mergeModules() {
	const outputDirectory = './SplitGplModules'; // 분리된 모듈 디렉토리
	const projectFilePath = path.join(outputDirectory, 'Project.gpr'); // 프로젝트 파일 경로
	const mergeOutputDirectory = './MergeCode'; // 통합 출력 디렉토리
	const mergedFilePath = path.join(mergeOutputDirectory, 'MergeCode.gpl'); // 통합된 파일 경로
	const mergedProjectFilePath = path.join(mergeOutputDirectory, 'Project.gpr'); // 통합된 프로젝트 파일 경로

	await ensureDirectoryExists(mergeOutputDirectory); // 출력 디렉토리 확인 및 생성

	const projectData = await readFileSafe(projectFilePath); // 프로젝트 파일 읽기
	if (!projectData) {
		console.log(chalk.red('Project file not found.'));
		return;
	}

	const lines = projectData.split(/\r?\n/); // 프로젝트 파일 내용 분리
	let mergedContent = '';

	for (const line of lines) {
		if (line.startsWith('ProjectSource=')) {
			// 각 모듈 파일 읽기 및 병합
			const moduleFileName = line.split('=')[1].replace(/"/g, '');
			const moduleFilePath = path.join(outputDirectory, moduleFileName);
			const moduleData = await readFileSafe(moduleFilePath);
			if (moduleData) mergedContent += moduleData + '\n';
		}
	}

	await writeFileSafe(mergedFilePath, mergedContent); // 통합된 내용 저장
	const projectContent = `'${new Date().toISOString()}\nProjectBegin\nProjectName="MergeCode"\nProjectStart="MAIN"\nProjectSource="MergeCode.gpl"\nProjectEnd\n`;
	await writeFileSafe(mergedProjectFilePath, projectContent); // 프로젝트 파일 저장
}

// ProjectFileManager 클래스
class ProjectFileManager {
	constructor(filePath, projectName = 'MergeCode', projectStart = 'MAIN') {
		this.filePath = filePath; // 프로젝트 파일 경로
		this.projectName = projectName; // 프로젝트 이름
		this.projectStart = projectStart; // 시작 파일
		this.modules = new Set(); // 포함된 모듈 이름 목록
	}

	async loadProjectFile() {
		// 프로젝트 파일 로드 및 모듈 목록 업데이트
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
		this.modules.add(moduleName); // 모듈 추가
	}

	async saveProjectFile() {
		// 프로젝트 파일 저장
		const timestamp = new Date().toISOString();
		let content = `'${timestamp}\nProjectBegin\nProjectName="${this.projectName}"\nProjectStart="${this.projectStart}"\n`;
		this.modules.forEach(module => {
			content += `ProjectSource="${module}"\n`;
		});
		content += 'ProjectEnd\n';
		await writeFileSafe(this.filePath, content);
	}
}
