const store = new Storage();
function Storage() {
	this.get = function (name) {
		return JSON.parse(window.localStorage.getItem(name));
	};

	this.set = function (name, value) {
		window.localStorage.setItem(name, JSON.stringify(value));
	};

	this.remove = function (name) {
		window.localStorage.removeItem(name);
	};

	this.clear = function () {
		window.localStorage.clear();
	};
}

const SettingsDefaults = {
	MyHives: ["global"],
	MuteUsers: [],
	MuteHives: []
};

const MessageCacheDefaults = {
	Enabled: true,
	EnabledGlobal: true,
	MaxCount: 50,
	Messages: {}
};

const Settings = store.get("SiteSettings") || SettingsDefaults;
Settings.Save = () => {
	store.set("SiteSettings", Settings);
};
Settings.Clear = () => {
	$.extend(Settings, SettingsDefaults);
	Settings.Save();
};

Settings.AddMyHive = (hiveName) => {
	if (!hiveName || hiveName.length == 0) {
		return;
	}

	if (!Settings.MyHives.includes(hiveName)) {
		Settings.MyHives.push(hiveName);
		Settings.Save();
	}
}

Settings.RemoveMyHive = (hiveName) => {
	if (!hiveName || hiveName.length == 0) {
		return;
	}

	if (Settings.MyHives.includes(hiveName)) {
		Settings.MyHives = Settings.MyHives.filter(e => e !== hiveName);
		Settings.Save();
	}
}

Settings.MuteUser = (handle) => {
	if (!handle || handle.length == 0) {
		return;
	}

	if (!Settings.MuteUsers.includes(handle)) {
		Settings.MuteUsers.push(handle);
		Settings.Save();
	}
}

Settings.UnmuteUser = (handle) => {
	if (!handle || handle.length == 0) {
		return;
	}

	if (Settings.MuteUsers.includes(handle)) {
		Settings.MuteUsers = Settings.MuteUsers.filter(e => e !== handle);
		Settings.Save();
	}
}

Settings.MuteHive = (hiveName) => {
	if (!hiveName || hiveName.length == 0) {
		return;
	}

	if (!Settings.MuteHives.includes(hiveName)) {
		Settings.MuteHives.push(hiveName);
		Settings.Save();
	}
}

Settings.UnmuteHive = (hiveName) => {
	if (!hiveName || hiveName.length == 0) {
		return;
	}

	if (Settings.MuteHives.includes(hiveName)) {
		Settings.MuteHives = Settings.MuteHives.filter(e => e !== hiveName);
		Settings.Save();
	}
}




const MessageCache = store.get("MessageCache") || MessageCacheDefaults;
MessageCache.Update = () => {
	store.set("MessageCache", MessageCache);
};

MessageCache.Clear = () => {
	$.extend(MessageCache, MessageCacheDefaults);
	MessageCache.Update();
};

MessageCache.AddMessage = (message) => {
	if (!message) {
		return;
	}

	if (message.Hive == "global" && MessageCache.EnabledGlobal == false) {
		return;
	}

	MessageCache.Messages[message.Id] = message;
	MessageCache.Trim();
	MessageCache.Update();
}

MessageCache.RemoveMessage = (messageId) => {
	if (!messageId) {
		return;
	}

	delete MessageCache.Messages[messageId]
	MessageCache.Update();
}

MessageCache.GetMessages = () => {
	return Object.keys(MessageCache.Messages)
		.sort((a, b) => { return MessageCache.Messages[a].Timestamp - MessageCache.Messages[b].Timestamp })
		.map(key => MessageCache.Messages[key]);
}

MessageCache.Trim = () => {
	const messageCount = Object.keys(MessageCache.Messages).length;
	if (messageCount > MessageCache.MaxCount) {
		const oldestKeys = Object.keys(MessageCache.Messages)
			.sort((a, b) => { return MessageCache.Messages[b].Timestamp - MessageCache.Messages[a].Timestamp })
		for (const key of oldestKeys.slice(MessageCache.MaxCount)) {
			delete MessageCache.Messages[key]
		}
	}
}

//Upgrade
if (MessageCache.EnabledGlobal == undefined) {
	MessageCache.EnabledGlobal = true;
	MessageCache.Update();
}