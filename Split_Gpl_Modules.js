// Node.js 기반으로 Brooks Automation GPL 통합 코드를 모듈별로 분류하거나 통합하는 프로그램

const fs = require('fs').promises; // 파일 시스템 모듈 불러오기 (Promise 사용)
const path = require('path'); // 파일 경로 모듈 불러오기
const readline = require('readline'); // 사용자 입력을 받기 위한 모듈

// 사용자에게 작업을 선택하도록 요청
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

rl.question('어떤 작업을 수행하시겠습니까? (1: 통합 코드 분류, 2: 모듈 통합): ', async (answer) => {
	if (answer === '1') {
		console.log('통합 코드 분류 작업을 시작합니다.');
		await splitModules();
	} else if (answer === '2') {
		console.log('모듈 통합 작업을 시작합니다.');
		await mergeModules();
	} else {
		console.log('잘못된 입력입니다. 프로그램을 종료합니다.');
	}
	waitForExit();
});

// 프로그램 종료 대기 함수
function waitForExit() {
	rl.question('아무 키나 눌러 프로그램을 종료하십시오.', () => {
		rl.close();
		process.exit(0);
	});
}

// 통합 코드를 모듈별로 분류하는 함수
async function splitModules() {
	// 파일 경로 설정 (상대 경로 사용)
	const inputFilePath = './MergeCode.gpl';
	const outputDirectory = './SplitGplModules';
	const projectFilePath = './SplitGplModules/Project.gpr';

	// 출력 폴더 생성 (이미 존재하면 무시)
	try {
		if (!await fs.access(outputDirectory).then(() => true).catch(() => false)) {
			await fs.mkdir(outputDirectory); // 폴더 생성
		}
	} catch (err) {
		console.error('출력 폴더를 생성하는 도중 오류가 발생했습니다:', err);
		process.exit(1);
	}

	// 파일 읽기 및 모듈 분리
	try {
		const data = await fs.readFile(inputFilePath, 'utf8');
		const moduleRegex = /((?:'[^\n]*\n)+)?(Module \w+[\s\S]*?End Module)/g;

		let match;
		let projectFileContent = `'${new Date().toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}\nProjectBegin\nProjectName="MergeCode"\nProjectStart="MAIN"\nProjectSource="__init__IOConfig__.gpl"\nProjectSource="__init__RobotConfig__.gpl"\n`;

		// 모듈별로 파일을 나누기
		while ((match = moduleRegex.exec(data)) !== null) {
			const comments = match[1] ? match[1] : '';
			const moduleContent = match[2];
			const moduleContentWithNewline = moduleContent.endsWith('\n\n') ? moduleContent : moduleContent + '\n\n';

			// 모듈 이름 추출
			const moduleNameMatch = moduleContent.match(/Module (\w+)/);
			const moduleName = moduleNameMatch ? moduleNameMatch[1] : 'UnknownModule';
			
			const fullContent = comments + moduleContentWithNewline;
			
			// 모듈별 파일 생성
			const outputFilePath = path.join(outputDirectory, `${moduleName}.gpl`);
			try {
				await fs.writeFile(outputFilePath, fullContent, 'utf8');
				console.log(`${moduleName} 모듈 파일이 성공적으로 생성되었습니다.`);
				projectFileContent += `ProjectSource="${moduleName}.gpl"\n`;
			} catch (writeErr) {
				console.error(`${moduleName} 모듈 파일을 생성하는 도중 오류가 발생했습니다:`, writeErr);
			}
		}
		// 프로젝트 파일 종료 부분 추가
		projectFileContent += 'ProjectEnd\n';

		// 프로젝트 파일 생성
		try {
			await fs.writeFile(projectFilePath, projectFileContent, 'utf8');
			console.log('프로젝트 파일이 성공적으로 생성되었습니다.');
		} catch (writeErr) {
			console.error('프로젝트 파일을 생성하는 도중 오류가 발생했습니다:', writeErr);
		}
	} catch (err) {
		console.error('파일을 읽는 도중 오류가 발생했습니다:', err);
	}
}


// 나눠진 모듈을 통합하여 MergeCode.gpl 파일과 Project.gpr 파일을 생성하는 함수
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
		console.error('MergeCode 폴더를 생성하는 도중 오류가 발생했습니다:', err);
		process.exit(1);
	}

	// Project.gpr 파일 읽기 및 모듈 통합
	try {
		const projectData = await fs.readFile(projectFilePath, 'utf8');
		let mergedFileContent = '';
		const projectLines = projectData.split('\n');

		for (const line of projectLines) {
			if (line.startsWith('ProjectSource=')) {
				const moduleFileName = line.split('=')[1].replace(/"|[\r\n]/g, '');
				const moduleFilePath = path.join(outputDirectory, moduleFileName);
				try {
					const moduleData = await fs.readFile(moduleFilePath, 'utf8');
					mergedFileContent += moduleData + '\n';
				} catch (readErr) {
					if (moduleFileName == '__init__IOConfig__.gpl' || moduleFileName == '__init__RobotConfig__.gpl') {
						console.warn(`${moduleFileName} 모듈 파일을 찾을 수 없어 무시합니다.`);
					} else {
						console.error(`${moduleFileName} 모듈 파일을 읽는 도중 오류가 발생했습니다:`, readErr);
					}
				}
			}
		}

		// MergeCode.gpl 파일 생성
		try {
			await fs.writeFile(mergedFilePath, mergedFileContent, 'utf8');
			console.log('MergeCode.gpl 파일이 성공적으로 생성되었습니다.');
		} catch (writeErr) {
			console.error('MergeCode.gpl 파일을 생성하는 도중 오류가 발생했습니다:', writeErr);
		}

		// Project.gpr 파일 생성 (항상 동일한 형식 사용, 시간만 변경)
		const fixedProjectFileContent = `'${new Date().toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}\nProjectBegin\nProjectName="MergeCode"\nProjectStart="MAIN"\nProjectSource="MergeCode.gpl"\nProjectSource="__init__IOConfig__.gpl"\nProjectSource="__init__RobotConfig__.gpl"\nProjectEnd\n`;
		try {
			await fs.writeFile(mergedProjectFilePath, fixedProjectFileContent, 'utf8');
			console.log('Project.gpr 파일이 성공적으로 생성되었습니다.');
		} catch (writeErr) {
			console.error('Project.gpr 파일을 생성하는 도중 오류가 발생했습니다:', writeErr);
		}
	} catch (err) {
		console.error('프로젝트 파일을 읽는 도중 오류가 발생했습니다:', err);
	}
}
