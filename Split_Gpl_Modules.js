// Node.js 기반으로 Brooks Automation GPL 통합 코드를 모듈별로 분류하는 프로그램

const fs = require('fs');
const path = require('path');

// 파일 경로 설정 (상대 경로 사용)
const inputFilePath = './MergeCode.gpl';
const outputDirectory = './modules';

// 출력 폴더 생성 (이미 존재하면 무시)
try {
	if (!fs.existsSync(outputDirectory)) {
		fs.mkdirSync(outputDirectory);
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
	}
});
