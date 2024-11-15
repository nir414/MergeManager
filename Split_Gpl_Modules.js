// Node.js 기반으로 Brooks Automation GPL 통합 코드를 모듈별로 분류하거나 통합하는 프로그램


  // ___ ___ _____ _   _ ___ 
 // / __| __|_   _| | | | _ \
 // \__ \ _|  | | | |_| |  _/
 // |___/___| |_|  \___/|_|  

const fs = require('fs').promises; // 파일 시스템 모듈 불러오기 (Promise 사용)
const path = require('path'); // 파일 경로 모듈 불러오기
const readline = require('readline'); // 사용자 입력을 받기 위한 모듈
const chalk = require('chalk'); // 터미널 텍스트 스타일링 모듈

// 콘솔 인터페이스 설정
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});



  // __  __   _   ___ _  _ 
 // |  \/  | /_\ |_ _| \| |
 // | |\/| |/ _ \ | || .` |
 // |_|  |_/_/ \_\___|_|\_|

displayMenu();
// 프로그램 시작 메뉴 출력 및 작업 선택 함수
function displayMenu() {
	console.log(chalk.blue.bold('\n======================================'));
	console.log(chalk.green('Brooks Automation GPL 코드 관리 시스템'));
	console.log(chalk.blue.bold('======================================'));
	console.log(chalk.yellow('1: 통합 코드 분류'));
	console.log(chalk.yellow('2: 모듈 통합'));
	console.log(chalk.red('0: 종료'));
	console.log(chalk.blue.bold('=============================\n'));
	rl.question(chalk.cyan('어떤 작업을 수행하시겠습니까?\n(숫자를 입력하세요): '), async (answer) => {
		if (answer === '1') {
			console.log(chalk.green('통합 코드 분류 작업을 시작합니다.'));
			await splitModules();
		} else if (answer === '2') {
			console.log(chalk.green('모듈 통합 작업을 시작합니다.'));
			await mergeModules();
		} else if (answer === '0') {
			console.log(chalk.red('프로그램을 종료합니다.'));
			exitProgram();
			return;
		} else {
			console.log(chalk.red('잘못된 입력입니다. 다시 시도해주세요.'));
			displayMenu();
			return;
		}
		displayMenu();
		// waitForExit();
	});
}

// 프로그램 종료 대기 함수
function exitProgram() {
	rl.question(chalk.cyan('아무 키나 눌러 프로그램을 종료하십시오.'), () => {
		rl.close();
		process.exit(0);
	});
}


// 통합 코드를 모듈별로 분류하는 함수
async function splitModules() {
	// const inputFilePath = './MergeCode.gpl';
	const inputFilePath = await promptFileSelection();
	const outputDirectory = './SplitGplModules';
	// const projectFilePath = './SplitGplModules/Project.gpr';
	const projectFilePath = path.join(outputDirectory, 'Project.gpr');


	// ProjectFileManager 인스턴스 생성 및 파일 로드
	const projectManager = new ProjectFileManager(projectFilePath);
	await projectManager.loadProjectFile();
	// 출력 폴더 생성 (이미 존재하면 무시)
	try {
		if (!await fs.access(outputDirectory).then(() => true).catch(() => false)) {
			await fs.mkdir(outputDirectory); // 폴더 생성
		}
	} catch (err) {
		console.error(chalk.red('출력 폴더를 생성하는 도중 오류가 발생했습니다:'), err);
		process.exit(1);
	}

	// 파일 읽기 및 모듈 분리
	try {
		const data = await fs.readFile(inputFilePath, 'utf8');
		const moduleRegex = /((?:'[^\n]*\n)+)?(Module \w+[\s\S]*?End Module)/g;

		let match;
		
		// 모듈별로 파일을 나누기
		while ((match = moduleRegex.exec(data)) !== null) {
			// const comments = match[1] ? match[1] : '';
			const comments = match[1] || '';
			const moduleContent = match[2];
			const fullContent = comments + moduleContent;
			
			// 모듈 이름 추출
			const moduleNameMatch = moduleContent.match(/Module (\w+)/);
			const moduleName = moduleNameMatch ? moduleNameMatch[1] : 'UnknownModule';
			const moduleFileName = `${moduleName}.gpl`;
			
			// 모듈별 파일 생성
			const outputFilePath = path.join(outputDirectory, moduleFileName);
			try {
				await fs.writeFile(outputFilePath, fullContent.replace(/\r?\n/g, '\r\n') + '\r\n\r\n', 'utf8');
				console.log(chalk.green(`${moduleName} 모듈 파일이 성공적으로 생성되었습니다.`));
				projectManager.addModule(moduleFileName);
			} catch (writeErr) {
				console.error(chalk.red(`${moduleName} 모듈 파일을 생성하는 도중 오류가 발생했습니다:`), writeErr);
			}
		}
		await projectManager.saveProjectFile();
	} catch (err) {
		console.error(chalk.red('파일을 읽는 도중 오류가 발생했습니다:'), err);
	}
}

// 분리된 모듈 파일을 하나의 MergeCode 파일로 통합하는 함수
async function mergeModules() {
	const outputDirectory = './SplitGplModules';
	const projectFilePath = './SplitGplModules/Project.gpr';
	const mergeOutputDirectory = './MergeCode';
	const mergedFilePath = path.join(mergeOutputDirectory, 'MergeCode.gpl');
	const mergedProjectFilePath = path.join(mergeOutputDirectory, 'Project.gpr');

	// MergeCode 폴더 생성 (이미 존재하면 무시)
	try {
		if (!await fs.access(mergeOutputDirectory).then(() => true).catch(() => false)) {
			await fs.mkdir(mergeOutputDirectory); // 폴더 생성
		}
	} catch (err) {
		console.error(chalk.red('MergeCode 폴더를 생성하는 도중 오류가 발생했습니다:'), err);
		process.exit(1);
	}

	// Project.gpr 파일 읽기 및 모듈 통합
	try {
		const projectData = await fs.readFile(projectFilePath, 'utf8');
		let mergedFileContent = '';
		const projectLines = projectData.split(/\r?\n/);

		// 각 모듈 파일을 읽고 병합
		for (const line of projectLines) {
			if (line.startsWith('ProjectSource=')) {
				const moduleFileName = line.split('=')[1].replace(/"|[\r\n]/g, '');
				const moduleFilePath = path.join(outputDirectory, moduleFileName);
				try {
					const moduleData = await fs.readFile(moduleFilePath, 'utf8');
					mergedFileContent += moduleData + '\r\n';
				} catch (readErr) {
					if (moduleFileName == '__init__IOConfig__.gpl' || moduleFileName == '__init__RobotConfig__.gpl') {
						console.warn(chalk.yellow(`${moduleFileName} 모듈 파일을 찾을 수 없어 무시합니다.`));
					} else {
						console.error(chalk.red(`${moduleFileName} 모듈 파일을 읽는 도중 오류가 발생했습니다:`), readErr);
					}
				}
			}
		}

		// MergeCode.gpl 파일 생성
		try {
			await fs.writeFile(mergedFilePath, mergedFileContent, 'utf8');
			console.log(chalk.green('MergeCode.gpl 파일이 성공적으로 생성되었습니다.'));
		} catch (writeErr) {
			console.error(chalk.red('MergeCode.gpl 파일을 생성하는 도중 오류가 발생했습니다:'), writeErr);
		}

		// Project.gpr 파일 생성 (항상 동일한 형식 사용, 시간만 변경)
		const fixedProjectFileContent = `'${new Date().toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}\r\nProjectBegin\r\nProjectName="MergeCode"\r\nProjectStart="MAIN"\r\nProjectSource="MergeCode.gpl"\r\nProjectSource="__init__IOConfig__.gpl"\r\nProjectSource="__init__RobotConfig__.gpl"\r\nProjectEnd\r\n`;
		try {
			await fs.writeFile(mergedProjectFilePath, fixedProjectFileContent, 'utf8');
			console.log(chalk.blue('Project.gpr 파일이 성공적으로 생성되었습니다.'));
		} catch (writeErr) {
			console.error(chalk.red('Project.gpr 파일을 생성하는 도중 오류가 발생했습니다:'), writeErr);
		}
	} catch (err) {
		console.error(chalk.red('프로젝트 파일을 읽는 도중 오류가 발생했습니다:'), err);
	}
}



// 파일 선택을 위한 사용자 프롬프트
async function promptFileSelection() {
	const files = await fs.readdir(__dirname); // 현재 디렉토리에서 파일 목록 가져오기
	const gplFiles = files.filter(file => file.endsWith('.gpl')); // .gpl 파일만 필터링하여 반환
	

	if (gplFiles.length === 0) {
		console.log(chalk.red('.gpl 파일이 현재 디렉토리에 없습니다.'));
		process.exit(1);
	}

	console.log(chalk.blue('\n현재 디렉토리에서 찾은 .gpl 파일 목록:'));
	gplFiles.forEach((file, index) => {
		console.log(chalk.yellow(`${index + 1}: ${file}`));
	});

	return new Promise((resolve) => {
		rl.question(chalk.cyan('\n사용할 파일 번호를 선택하세요: '), (answer) => {
			const index = parseInt(answer) - 1;
			if (isNaN(index) || index < 0 || index >= gplFiles.length) {
				console.log(chalk.red('유효하지 않은 선택입니다.'));
				process.exit(1);
			}
			resolve(gplFiles[index]);
		});
	});
}



        // __                   ____               _           __                   
  // _____/ /___ ___________   / __ \_________    (_)__  _____/ /_ ____ _____  _____
 // / ___/ / __ `/ ___/ ___/  / /_/ / ___/ __ \  / / _ \/ ___/ __// __ `/ __ \/ ___/
// / /__/ / /_/ (__  |__  )  / ____/ /  / /_/ / / /  __/ /__/ /__/ /_/ / /_/ / /    
// \___/_/\__,_/____/____/  /_/   /_/   \____/_/ /\___/\___/\__(_)__, / .___/_/     
                                         // /___/               /____/_/            
class ProjectFileManager {
	constructor(filePath, projectName = 'MergeCode', projectStart = 'MAIN') {
		this.filePath = filePath;
		this.projectName = projectName;
		this.projectStart = projectStart;
		this.modules = new Set();
	}

	getCurrentTimestamp() {
		return new Date().toLocaleString('en-US', {
			month: '2-digit',
			day: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hour12: true
		});
	}

	async loadProjectFile() {
		try {
			const data = await fs.readFile(this.filePath, 'utf8');
			const moduleMatches = data.match(/ProjectSource="(.+?\.gpl)"/g) || [];
			moduleMatches.forEach(match => {
				const moduleName = match.match(/ProjectSource="(.+?)"/)[1];
				this.modules.add(moduleName);
			});
		} catch (err) {
			if (err.code !== 'ENOENT') {
				console.error(chalk.red('Project.gpr 파일을 읽는 도중 오류가 발생했습니다:'), err);
				throw err;
			}
			console.log(chalk.yellow('Project.gpr 파일이 없으므로 새로 생성됩니다.'));
		}
	}

	addModule(moduleFileName) {
		if (!this.modules.has(moduleFileName)) {
			this.modules.add(moduleFileName);
		}
	}

	async saveProjectFile() {
		let content = `'${this.getCurrentTimestamp()}\n`;
		content += `ProjectBegin\n`;
		content += `ProjectName="${this.projectName}"\n`;
		content += `ProjectStart="${this.projectStart}"\n`;

		this.modules.forEach(module => {
			content += `ProjectSource="${module}"\n`;
		});
		content += `ProjectEnd\n`;

		try {
			await fs.writeFile(this.filePath, content, 'utf8');
			console.log(chalk.blue('Project.gpr 파일이 성공적으로 저장되었습니다.'));
		} catch (err) {
			console.error(chalk.red('Project.gpr 파일 저장 중 오류가 발생했습니다:'), err);
		}
	}
}