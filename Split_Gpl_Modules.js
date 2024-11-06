// Node.js 기반으로 Brooks Automation GPL 통합 코드를 모듈별로 분류하거나 통합하는 프로그램

const fs = require('fs'); // 파일 시스템 모듈 불러오기
const path = require('path'); // 파일 경로 모듈 불러오기
const readline = require('readline'); // 사용자 입력을 받기 위한 모듈

// 사용자에게 작업을 선택하도록 요청
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

rl.question('어떤 작업을 수행하시겠습니까? (1: 통합 코드 분류, 2: 모듈 통합): ', (answer) => {
	if (answer === '1') {
		// 통합 코드 분류 작업 실행
		splitModules();
	} else if (answer === '2') {
		// 모듈 통합 작업 실행
		mergeModules();
	} else {
		console.log('잘못된 입력입니다. 프로그램을 종료합니다.');
	}
	rl.close();
});

// 통합 코드를 모듈별로 분류하는 함수
function splitModules() {
	// 파일 경로 설정 (상대 경로 사용)
	const inputFilePath = './MergeCode.gpl';
	const outputDirectory = './SplitGplModules';
	const projectFilePath = './SplitGplModules/Project.gpr';

	// 출력 폴더 생성 (이미 존재하면 무시)
	try {
		// 출력 폴더가 존재하지 않으면 새로 생성합니다.
		if (!fs.existsSync(outputDirectory)) {
			fs.mkdirSync(outputDirectory); // 폴더 생성
		}
	} catch (err) {
		console.error('출력 폴더를 생성하는 도중 오류가 발생했습니다:', err);
		process.exit(1);
	}

	// 파일 읽기 및 모듈 분리
	fs.readFile(inputFilePath, 'utf8', (err, data) => {
		if (err) {
			console.error('파일을 읽는 도중 오류가 발생했습니다:', err);
			return;
		}

		// 주석 포함 모듈 찾기 정규 표현식 정의
		const moduleRegex = /((?:'[^\n]*\n)+)?(Module \w+[\s\S]*?End Module)/g;
		// Module을 찾는 정규 표현식 정의 = /Module (\w+)([\s\S]*?)End Module/g;
		let match;
		// 프로젝트 파일 생성 시작
		let projectFileContent = `'${new Date().toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}\nProjectBegin\nProjectName="SplitGplModules"\nProjectStart="MAIN"\n`;

		// 모듈별로 파일을 나누기
		while ((match = moduleRegex.exec(data)) !== null) {
			const comments = match[1] ? match[1] : '';
			const moduleContent = match[2];

			// 모듈 이름 추출
			const moduleNameMatch = moduleContent.match(/Module (\w+)/);
			const moduleName = moduleNameMatch ? moduleNameMatch[1] : 'UnknownModule';
			
			const fullContent = comments + moduleContent;
			
			// 모듈별 파일 생성
			const outputFilePath = path.join(outputDirectory, `${moduleName}.gpl`);
			fs.writeFile(outputFilePath, fullContent, 'utf8', (writeErr) => {
				if (writeErr) {
					console.error(`${moduleName} 모듈 파일을 생성하는 도중 오류가 발생했습니다:`, writeErr);
				} else {
					console.log(`${moduleName} 모듈 파일이 성공적으로 생성되었습니다.`);
				}
			});
			// 프로젝트 파일 내용 업데이트
			projectFileContent += `ProjectSource="${moduleName}.gpl"\n`;
		}
		// 프로젝트 파일 종료 부분 추가
		projectFileContent += 'ProjectEnd\n';

		// 프로젝트 파일 생성
		fs.writeFile(projectFilePath, projectFileContent, 'utf8', (writeErr) => {
			if (writeErr) {
				console.error('프로젝트 파일을 생성하는 도중 오류가 발생했습니다:', writeErr);
			} else {
				console.log('프로젝트 파일이 성공적으로 생성되었습니다.');
			}
		});
	});
}


// 나눠진 모듈을 통합하여 MergeCode.gpl 파일과 Project.gpr 파일을 생성하는 함수
function mergeModules() {
	const outputDirectory = './SplitGplModules';
	const projectFilePath = './SplitGplModules/Project.gpr';
	const mergeOutputDirectory = './MergeCode';
	const mergedFilePath = path.join(mergeOutputDirectory, 'MergeCode.gpl');
	const mergedProjectFilePath = path.join(mergeOutputDirectory, 'Project.gpr');

	// MergeCode 폴더 생성 (이미 존재하면 무시)
	try {
		if (!fs.existsSync(mergeOutputDirectory)) {
			fs.mkdirSync(mergeOutputDirectory); // 폴더 생성
		}
	} catch (err) {
		console.error('MergeCode 폴더를 생성하는 도중 오류가 발생했습니다:', err);
		process.exit(1);
	}

	// Project.gpr 파일 읽기 및 모듈 통합
	fs.readFile(projectFilePath, 'utf8', (err, projectData) => {
		if (err) {
			console.error('프로젝트 파일을 읽는 도중 오류가 발생했습니다:', err);
			return;
		}

		// MergeCode.gpl 파일 생성 시작
		let mergedFileContent = '';
		const projectLines = projectData.split('\n');

		for (const line of projectLines) {
			if (line.startsWith('ProjectSource=')) {
				// const moduleFileName = line.split('=')[1].replace(/"/g, '');
				const moduleFileName = line.split('=')[1].replace(/"|[\r\n]/g, '');
				const moduleFilePath = path.join(outputDirectory, moduleFileName);
				try {
					const moduleData = fs.readFileSync(moduleFilePath, 'utf8');
					mergedFileContent += moduleData + '\n';
				} catch (readErr) {
					console.error(`${moduleFileName} 모듈 파일을 읽는 도중 오류가 발생했습니다:`, readErr);
				}
			}
		}

		// MergeCode.gpl 파일 생성
		fs.writeFile(mergedFilePath, mergedFileContent, 'utf8', (writeErr) => {
			if (writeErr) {
				console.error('MergeCode.gpl 파일을 생성하는 도중 오류가 발생했습니다:', writeErr);
			} else {
				console.log('MergeCode.gpl 파일이 성공적으로 생성되었습니다.');
			}
		});

		// // Project.gpr 파일 복사
		// fs.copyFile(projectFilePath, mergedProjectFilePath, (copyErr) => {
			// if (copyErr) {
				// console.error('Project.gpr 파일을 복사하는 도중 오류가 발생했습니다:', copyErr);
			// } else {
				// console.log('Project.gpr 파일이 성공적으로 복사되었습니다.');
			// }
		// });
	});
}