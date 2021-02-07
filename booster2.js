const readline = require('readline');
const fs = require('fs');

const _nodeVer = process.version.match(/^v(\d+)[.](\d+)/);
const nodeVer = Number(_nodeVer[1]) + (_nodeVer[2] * 0.1);
if(nodeVer >= 7.6) {
	eval("global.async = fn => (async(...args) => await fn(...args));");
} else {
	global.async = require('asyncawait').async;
	global.await = require('asyncawait').await;
}

const URL = require('url');
const print = console.log;

if(!console.clear) console.clear = (function() {
	process.stdout.write('\033c');
});

function input(prpt) {
	return new Promise((resolve, reject) => {
		process.stdout.write(prpt);
		const rl = readline.createInterface(process.stdin, process.stdout);
		rl.question(prpt, ret => {
			rl.close();
			resolve(ret);
		});
	});
}

function timeout(ms) {
	return new Promise((resolve, reject) => {
		setTimeout(() => resolve(0), ms);
	});
}

function progress(val) {
	if(val > 95) return '[####################]';
	if(val > 90) return '[###################-]';
	if(val > 85) return '[##################--]';
	if(val > 80) return '[#################---]';
	if(val > 75) return '[################----]';
	if(val > 70) return '[###############-----]';
	if(val > 65) return '[##############------]';
	if(val > 60) return '[#############-------]';
	if(val > 55) return '[############--------]';
	if(val > 50) return '[###########---------]';
	if(val > 45) return '[##########----------]';
	if(val > 40) return '[#########-----------]';
	if(val > 35) return '[########------------]';
	if(val > 30) return '[#######-------------]';
	if(val > 25) return '[######--------------]';
	if(val > 20) return '[#####---------------]';
	if(val > 15) return '[####----------------]';
	if(val > 10) return '[###-----------------]';
	if(val >  5) return '[##------------------]';
	if(val >  0) return '[#-------------------]';
	if(val > -1) return '[--------------------]';
}

(async(() => {
	const url =         await (input('화일 주소: '));
	const fn  =         await (input('화일 이름: '));
	const trd = Number(await (input('다운로드 강도: '))) || 1;
	
	const http = require(url.startsWith('https:') ? 'https' : 'http');
	
	http.get(url, async (res => {
		res.setEncoding('base64'); 
		const total = Number(res.headers['content-length']);
		const boostable = res.headers['accept-ranges'] == 'bytes';
		
		if(!boostable) print('경고: 헤더에 Accept-Ranges이 없거나 바이트 기반이 아니므로 이 화일 다운로드는 부스트할 수 없습니다.\n');
		if(!total) print('경고: 화일의 총 크기를 모르기 때문에 다운로드를 부스트할 수 없습니다.\n');
		
		var completed = [], comp = 0;
		var downloader = [];
		var downloads = [];
		var totals = [];
		var tt = [];
		// trd = (total % trd ? (trd + 1) : trd);
		var unit = Math.floor(total / trd);
		var range = 0;
		
		function get(opt) {
			return new Promise((resolve, reject) => {
				http.get({
					host: URL.parse(url).host,
					path: URL.parse(url).path,
					headers: {
						'Range': 'bytes=' + range + '-' + (range + unit)
					}
				}, res => resolve(res));
			});
		}
		
		for (
			i = 1, range = 0;
			i <= trd; 
			i++  // , range += (unit + 0)
		) {
			(function() {
				var res = await (get({
					host: URL.parse(url).host,
					path: URL.parse(url).path,
					headers: {
						'Range': 'bytes=' + range + '-' + (range + unit)
					}
				}));
				// res.setEncoding('binary');
				
				if((res.statusCode + '')[0] != 2) return;
				
				var id = i;
				
				print(i + '번 다운로더 준비.');
				
				downloader[id] = [];
				downloads[id] = '';
				completed[id] = 0;
				totals[id] = tt[id] = Number(res.headers['content-length']);
				// print(range, totals[id], range + totals[id])
				range += totals[id];
				
				res.on('data', chunk => downloader[id].push(chunk));
				res.on('end', () => comp++, completed[id] = 1);
				
				// set(i);
			})();
			
			await (timeout(200));
		}
		
		var printer = setInterval(async(() => {
			console.clear();
			var totalbytes = '';
			for(di in downloader) {
				var dn = downloader[di];
				if(!dn || !dn.length) continue;
				var cc = Buffer.concat(dn);
				var len = cc.length;
				var pc = (len / totals[di]) * 100;
				
				print((di < 10 ? ' ' : '') + di + '번 다운로더: ' + progress(pc) + ' (' + Math.floor(pc) + '%) ' + totals[di] + ' 중 ' + len + ' 바이트');
			}
			
			if(comp >= trd) {
				clearInterval(printer);
				
				if(fs.existsSync('./' + fn)) {
					var _fn = await (input('화일이 이미 있습니다. 바로 [Enter]를 눌러 덮어쓰거나 새로운 화일명을 입력하십시오.\n> '));
					if(_fn) fn = _fn;
				}
				fs.writeFileSync('./' + fn, '');
				// var ret = Buffer.from('');
				for(di in downloader) {
					for(f of downloader[di]) {
						fs.appendFileSync('./' + fn, f, 'binary');
						await (timeout(10));
					}
					// Buffer.concat(downloader[di])
					// ret = Buffer.concat([ret, Buffer.concat(downloader[di])]);
				}
				// fs.writeFileSync('./' + fn, ret.toString('base64'), 'base64');
				process.exit(0);
			}
		}), 1000);
	})).end();
}))();

setInterval(() => 5, 20202020);
