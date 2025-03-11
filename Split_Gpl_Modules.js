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

// readline.question을 Promise로 래핑
function askQuestion(query) {
	return new Promise((resolve) => {
		rl.question(query, (answer) => {
			resolve(answer);
		});
	});
}

// 프로그램 종료 대기 함수
function exitProgram() {
	rl.question(chalk.cyan('아무 키나 눌러 프로그램을 종료하십시오.'), () => {
		rl.close();
		process.exit(0);
	});
}



 // ____  ____  ____  _  _   ___ 
// (    \(  __)(  _ \/ )( \ / __)
 // ) D ( ) _)  ) _ () \/ (( (_ \
// (____/(____)(____/\____/ \___/

let isDebugMode = true; // 디버깅 모드 플래그

// 디버깅 및 로깅 관련 함수
async function debugLogWithPause(message, data = null) {
	if (!isDebugMode) return;

	const timestamp = new Date().toISOString();

	// 줄 번호 가져오기 (스택 추적)
	const stack = new Error().stack;
	const callerLine = stack.split('\n')[2]; // 호출자의 스택 정보
	const lineInfo = callerLine.trim().replace(/.*\((.*)\)/, '$1'); // 줄 번호와 파일 경로 추출

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




  // __  __   _   ___ _  _ 
 // |  \/  | /_\ |_ _| \| |
 // | |\/| |/ _ \ | || .` |
 // |_|  |_/_/ \_\___|_|\_|

// 프로그램의 진입점
(async function main() {
	try {
		await displayMenu();
	} catch (err) {
		if (err.message === 'Program terminated by user') {
			console.log(chalk.red('프로그램이 종료되었습니다.'));
			exitProgram()
		} else {
			console.error(chalk.red('예기치 못한 오류가 발생했습니다:'), err);
			exitProgram()
		}
	}
})();

// 프로그램 시작 메뉴 출력 및 작업 선택 함수
async function displayMenu() {
	console.log(chalk.blue.bold('\n======================================'));
	console.log(chalk.green('Brooks Automation GPL 코드 관리 시스템'));
	console.log(chalk.blue.bold('======================================'));
	console.log(chalk.yellow('1: 통합 코드 분류'));
	console.log(chalk.yellow('2: 모듈 통합'));
	console.log(chalk.red('0: 종료'));
	console.log(chalk.blue.bold('=============================\n'));
	const answer = await askQuestion(chalk.cyan('어떤 작업을 수행하시겠습니까?\n(숫자를 입력하세요): '));
	if (answer === '1') {
		console.log(chalk.green('통합 코드 분류 작업을 시작합니다.'));
		await splitModules();
	} else if (answer === '2') {
		console.log(chalk.green('모듈 통합 작업을 시작합니다.'));
		await mergeModules();
	} else if (answer === '0') {
		console.log(chalk.red('프로그램을 종료합니다.'));
		throw new Error('Program terminated by user');
		// exitProgram();
		return;
	} else {
		console.log(chalk.red('잘못된 입력입니다. 다시 시도해주세요.'));
		await displayMenu();
		return;
	}
	await displayMenu();
	// waitForExit();
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


// 통합 코드를 모듈별로 분류하는 함수
async function splitModules() {
  // 1) 사용자에게 'MergeCode.gpl' 선택받기
  const inputFilePath = await promptFileSelection();
  
  // 2) 원본 'MergeCode.gpl' 있는 폴더 경로
  const inputDir = path.dirname(inputFilePath);
  // => 예: /Users/username/myProject (상대경로일 수도 있음)
  
  // 3) 원본 폴더의 Project.gpr 경로
  //    (실제로 있는지 없는지는 loadProjectFile() 할 때 검사)
  const existingProjectFilePath = path.join(inputDir, 'Project.gpr');
  
  // 4) "결과물"을 저장할 폴더 & Project.gpr 경로
  const outputDirectory = './SplitGplModules'; // 그대로 사용
  const resultProjectFilePath = path.join(outputDirectory, 'Project.gpr');

  // 5) ProjectFileManager를 생성할 때, 일단 "기존" 위치를 filePath로 준다
  const projectManager = new ProjectFileManager(existingProjectFilePath);
  // => loadProjectFile()에서 "inputDir/Project.gpr" 불러옴(없으면 새로 만든다고 안내)
  
  // 6) 불러오기
  await projectManager.loadProjectFile();
  
  // 7) 이제 filePath를 "결과"로 바꿔치기:
  projectManager.filePath = resultProjectFilePath;
  
  // 8) 출력 폴더가 없으면 생성
	try {
		if (!await fs.access(outputDirectory).then(() => true).catch(() => false)) {
			await fs.mkdir(outputDirectory); // 폴더 생성
		}
	} catch (err) {
		console.error(chalk.red('출력 폴더 생성 중 오류:'), err);
		exitProgram();
	}

  // 9) 모듈 분리 작업
	try {
		const data = await fs.readFile(inputFilePath, 'utf8');
		const moduleRegex = /((?:[ \t]*'[^\r\n]*(?:\r?\n)+)+)?(Module \w+[\s\S]*?End Module)/g;


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
			
      // 모듈파일을 outputDirectory에 생성
			const outputFilePath = path.join(outputDirectory, moduleFileName);
      await fs.writeFile(
        outputFilePath,
        fullContent.replace(/\r?\n/g, '\r\n') + '\r\n\r\n',
        'utf8'
      );
      console.log(chalk.green(`${moduleName} 모듈 파일 생성 완료.`));
      
      // 프로젝트 매니저에도 등록
      projectManager.addModule(moduleFileName);
		}
    // 10) 최종 Project.gpr 저장
    await projectManager.saveProjectFile();
    console.log(chalk.cyan(`새 Project.gpr가 ${resultProjectFilePath} 에 만들어졌습니다!`));
	} catch (err) {
		console.error(chalk.red('파일을 읽는 도중 오류가 발생했습니다:'), err);
	}
}

// 분리된 모듈 파일을 하나의 MergeCode 파일로 통합하는 함수
async function mergeModules() {
	const outputDirectory = './SplitGplModules';
	// const projectFilePath = './SplitGplModules/Project.gpr';
	const projectFilePath = path.join(outputDirectory, 'Project.gpr');
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
		exitProgram();
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
					console.error(chalk.red(`${moduleFileName} 모듈 파일을 읽는 도중 오류가 발생했습니다:`), readErr);
					// if (moduleFileName == '__init__IOConfig__.gpl' || moduleFileName == '__init__RobotConfig__.gpl') {
						// console.warn(chalk.yellow(`${moduleFileName} 모듈 파일을 찾을 수 없어 무시합니다.`));
					// } else {
						// console.error(chalk.red(`${moduleFileName} 모듈 파일을 읽는 도중 오류가 발생했습니다:`), readErr);
					// }
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
		const fixedProjectFileContent = `'${new Date().toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}\r\nProjectBegin\r\nProjectName="MergeCode"\r\nProjectStart="MAIN"\r\nProjectSource="MergeCode.gpl"\r\nProjectEnd\r\n`;
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



// 파일 선택 프롬프트
async function promptFileSelection() {
	const files = await fs.readdir(process.cwd()); // 현재 작업 디렉토리에서 파일 목록 가져오기
	const gplFiles = files.filter(file => file.toLowerCase().endsWith('.gpl')); // 대소문자를 무시하고 .gpl 필터링

	if (gplFiles.length === 0) {
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
		await displayMenu();
		// throw new Error('Program terminated by user');
	}
	return path.join(process.cwd(), gplFiles[index]); // 선택한 파일 경로 반환
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
      // 기존 Project.gpr 파일 읽어오기
			const data = await fs.readFile(this.filePath, 'utf8');
			
      // (1) ProjectName="..." 찾기
      const nameMatch = data.match(/ProjectName="(.+?)"/);
      if (nameMatch) {
        this.projectName = nameMatch[1];
      }

      // (2) ProjectStart="..." 찾기
      const startMatch = data.match(/ProjectStart="(.+?)"/);
      if (startMatch) {
        this.projectStart = startMatch[1];
      }

      // (3) ProjectSource="..." 찾기 → modules에 추가
			const moduleMatches = data.match(/ProjectSource="(.+?\.gpl)"/g) || [];
			
			
			// await moduleMatches.forEach(async match => {
				// const moduleName = match.match(/ProjectSource="(.+?)"/)[1];
				// debugLogWithPause('debug: match.match(/ProjectSource="(.+?)"/)[1]', match.match(/ProjectSource="(.+?)"/)[1]);

				// this.modules.add(moduleName);
			// });
			
			for (const match of moduleMatches) {
				const moduleName = match.match(/ProjectSource="(.+?)"/)[1];
				// await debugLogWithPause('match.match(/ProjectSource="(.+?)"/)[1]', moduleName);
				this.modules.add(moduleName);
			} 
			console.log(chalk.yellow(`기존 Project.gpr 정보를 불러왔습니다.\n- ProjectName: ${this.projectName}\n- ProjectStart: ${this.projectStart}\n- Modules:`, [...this.modules]));
		} catch (err) {
      // (4) 파일이 없는 경우: 기본값 사용 + 새로 생성 예정
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
		
    // modules를 순회하며 ProjectSource="..." 행을 추가
		this.modules.forEach(module => {
			content += `ProjectSource="${module}"\n`;
		});
		content += `ProjectEnd\n`;

		try {
			await fs.writeFile(this.filePath, content, 'utf8');
			console.log(chalk.blue('Project.gpr 파일이 성공적으로 저장되었습니다. (경로: ${this.filePath})'));
		} catch (err) {
			console.error(chalk.red('Project.gpr 파일 저장 중 오류가 발생했습니다:'), err);
		}
	}
}

