import ChatModule from './modules/ChatModule.js';
class BetterYTL {
	loadPredicates = {
		chat: () => !!document.querySelectorAll('#items.yt-live-chat-item-list-renderer').length
	}

	constructor(){
	}

	// Big thanks to BetterTTV for this code
	async waitForLoad(type, context = null){
		let timeout;
		let interval;
		const startTime = Date.now();
		await Promise.race([
			new Promise(resolve => {
				timeout = setTimeout(resolve, 10000);
			}),
			new Promise(resolve => {
				const loaded = this.loadPredicates[type];
				if (loaded(context)) {
					resolve();
					return;
				}
				interval = setInterval(() => loaded(context) && resolve(), 25);
			})
		]);
		console.log(`waited for ${type} load: ${Date.now() - startTime}ms`);
		clearTimeout(timeout);
		clearInterval(interval);
	}

	onRouteChange(location) {
		switch(location){
			case '/live_chat':
			case '/live_chat_replay':
				this.waitForLoad('chat').then(() => {
					let c = new ChatModule;
					console.log('c', c);
					c.start();
				});
			break;
		}
	}

	start() {
console.log('BetterYTL: Started');
		window.onpopstate = (event) => {
			this.onRouteChange(window.location.pathname);
		};
		this.onRouteChange(window.location.pathname);
	}
}

let instance = new BetterYTL();
instance.start();