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
	MyHives: ["hive"],
	MuteUsers: [],
	MuteHives: [],
	Theme: "light",
	RenderLinks: false,
	RenderLinksFollowOnly: false,
	LastSelectedHives: ["hive"]
};

const MessageCacheDefaults = {
	Enabled: true,
	MaxCount: 25,
	AllowSync: false,
	Messages: {}
};

const FollowCacheDefaults = {
	Followers: {}
}



const Settings = store.get("SiteSettings") || SettingsDefaults;
Settings.Save = () => {

	// TODO remove later
	delete Settings.LastSelectedHive;

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


Settings.UpdateTheme = (theme) => {
	if (theme != "light" && theme != "dark") {
		theme = "light";
	}
	if (Settings.Theme != theme) {
		Settings.Theme = theme;
		Settings.Save();
	}
	$("#theme-css").attr("href", "/Content/Css/bootstrap-" + theme + ".css?v=2");
};

if (Settings.Theme != "light") {
	Settings.UpdateTheme(Settings.Theme);
}







const MessageCache = store.get("MessageCache") || MessageCacheDefaults;
MessageCache.Update = () => {
	store.set("MessageCache", MessageCache);
};

MessageCache.Clear = () => {
	$.extend(MessageCache, MessageCacheDefaults);
	MessageCache.Update();
};

MessageCache.Add = (message) => {
	if (!message) {
		return false;
	}

	if (MessageCache.Messages[message.Id] !== undefined) {
		return false;
	}

	MessageCache.Messages[message.Id] = message;
	MessageCache.Trim();
	MessageCache.Update();
	return true;
}

MessageCache.AddRange = (messages) => {
	if (!messages) {
		return false;
	}

	for (const message of messages) {
		if (MessageCache.Messages[message.Id] !== undefined) {
			continue;
		}
		MessageCache.Messages[message.Id] = message;
	}

	MessageCache.Trim();
	MessageCache.Update();
	return true;
}

MessageCache.Remove = (messageId) => {
	if (!messageId) {
		return;
	}

	const message = MessageCache.Messages[messageId];
	if (message === undefined) {
		return;
	}

	message.Message = "[deleted]";
	message.IsDeleted = true;
	MessageCache.Update();
}

MessageCache.GetMessages = () => {
	return Object.values(MessageCache.Messages)
		.sort((a, b) => { return a.Timestamp - b.Timestamp });
}

MessageCache.Trim = () => {
	const values = Object.values(MessageCache.Messages);
	if (values.length > MessageCache.MaxCount) {
		const oldestKeys = values
			.sort((a, b) => { return b.Timestamp - a.Timestamp })
			.map(x => x.Id)
			.slice(MessageCache.MaxCount);
		for (const key of oldestKeys) {
			delete MessageCache.Messages[key]
		}
	}
}

MessageCache.GetCacheTime = () => {
	const values = Object.values(MessageCache.Messages);
	if (values.length > 0) {
		const timestamps = values.map(x => x.Timestamp);
		return Math.max(...timestamps);
	}
	return 0;
}

MessageCache.GetSyncMessages = (request) => {
	return Object.values(MessageCache.Messages)
		.filter(x => x.Timestamp > request.CacheTime && x.MessageType.includes("Feed"))
		.sort((a, b) => { return b.Timestamp - a.Timestamp })
		.slice(0, Math.min(request.MaxCount, MessageCache.MaxCount));
}


//Upgrade
if (MessageCache.AllowSync == undefined) {
	MessageCache.AllowSync = false;
	MessageCache.Update();
}














const FollowCache = store.get("FollowCache") || FollowCacheDefaults;
FollowCache.Update = () => {
	store.set("FollowCache", FollowCache);
};

FollowCache.Clear = () => {
	$.extend(FollowCache, FollowCacheDefaults);
	FollowCache.Update();
};

FollowCache.AddFollower = (userHandle) => {
	if (!userHandle) {
		return;
	}

	FollowCache.Followers[userHandle] = userHandle;
	FollowCache.Update();
}

FollowCache.RemoveFollower = (userHandle) => {
	if (!userHandle) {
		return;
	}

	delete FollowCache.Followers[userHandle]
	FollowCache.Update();
}

FollowCache.GetFollowers = () => {
	return Object.keys(FollowCache.Followers)
		.sort((a, b) => { return a.localeCompare(b) })
		.map(key => FollowCache.Followers[key]);
}

FollowCache.IsFollower = (userHandle) => {
	return FollowCache.Followers.hasOwnProperty(userHandle);
}

FollowCache.HasFollowers = () => {
	return Object.keys(FollowCache.Followers).length > 0;
}