(async ($) => {

	Settings.UnmuteUser(currentUserHandle);

	const toastTemplate = $("#toastTemplate").html();
	const mentionTemplate = $("#mentionTemplate").html();
	const messageTemplate = $("#messageTemplate").html();
	const friendsTemplate = $("#friendsTemplate").html();
	const trendingHiveTemplate = $("#trendingHiveTemplate").html();
	const myHiveTemplate = $("#myHiveTemplate").html();
	const settingMuteHiveTemplate = $("#settingMuteHiveTemplate").html();
	const settingMuteUserTemplate = $("#settingMuteUserTemplate").html();
	const followerTemplate = $("#followerTemplate").html();
	const followingTemplate = $("#followingTemplate").html();
	const emptyListTemplate = $("#emptyListTemplate").html();

	const linkifyImgurLink = $("#linkifyImgurLink").html();
	const linkifyImgurRegexp = /https?:\/\/(?:www\.)?(?:i\.)?imgur\.com\/(a|gallery)?\/?([\w+]+).?(?:[\w+]+)?/;

	const linkifyYoutubeLink = $("#linkifyYoutubeLink").html();
	const linkifyYoutubeRegexp = /.*(?:youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=)([^#\&\?]*).*/;

	const linkify = (text) => {
		
		if (text.match(linkifyImgurRegexp)) {
			const match = linkifyImgurRegexp.exec(text);
			const embedCode = match[1] === undefined
				? match[2]
				: "a/" + match[2];
			return Mustache.render(linkifyImgurLink, embedCode);
		}

		if (text.match(linkifyYoutubeRegexp)) {
			const match = linkifyYoutubeRegexp.exec(text);
			return Mustache.render(linkifyYoutubeLink, match[1]);
		}
		return;
	}


	const renderEmbeddedTags = (data) => {
		if (!Settings.RenderLinks) {
			return data;
		}

		if (data.Sender != currentUserHandle) {
			if (Settings.RenderLinksFollowOnly == true && !FollowCache.IsFollower(data.Sender)) {
				return data;
			}
		}
		return { ...data, EmbeddedTags: linkify(data.Message) };
	}


	const joinHive = async (hive) => {
		const hiveName = getHiveName(hive);
		const result = await hiveHub.server.joinHive(hiveName);
		if (result == true) {
			Settings.AddMyHive(hiveName);

			const existingHive = $("#myhive-" + hive);
			if (existingHive.length == 0) {
				$("#myhive-hives").prepend(Mustache.render(myHiveTemplate, { Hive: hive }));
				$("#feed-message-option-hives").append("<option id='hive-option-" + hive+"' value='" + hive + "'>" + hive + "</option>");
			}
		}
	}

	const leaveHive = async (hive) => {
		const hiveName = getHiveName(hive);
		const result = await hiveHub.server.leaveHive(hiveName);
		if (result == true) {
			Settings.RemoveMyHive(hiveName);

			$("#myhive-" + hive).remove();
			$("#hive-option-" + hive).remove();
			// TODO: find all messages in hive and remove from cache and ui
		}
	}

	const getHiveName = (hive) => {
		return hive.replace("#", "").trim().toLowerCase();
	}


	const addNewMessage = (data, updateUnread) => {
		if (!Settings.MuteUsers.includes(data.Sender)) {
			data.TimeElapsed = moment.utc(data.Timestamp).fromNow();
			const feedList = $("#feed-messages-myhives");
			if (feedList.find(".message-id-" + data.Id).length == 0) {
				$("#feed-placeholder-myhives").remove();

				const renderedMessage = renderEmbeddedTags(data);
				feedList.prepend(Mustache.render(messageTemplate, renderedMessage));
				if (updateUnread) {
					if (data.Sender != currentUserHandle) {
						const isActive = $("#feed-tabs-myhives-nav").hasClass("active");
						if (isActive == false) {
							const unreadLabel = $("#feed-tab-unread-myhives");
							unreadLabel.text(Number(unreadLabel.text()) + 1).show();
						}
					}
				}
			}
		}
	}

	const addNewMentionMessage = (data) => {
		if (!Settings.MuteUsers.includes(data.Sender)) {
			data.TimeElapsed = moment.utc(data.Timestamp).fromNow();
			const feedList = $("#feed-messages-mention");
			if (feedList.find(".message-id-" + data.Id).length == 0) {
				$("#feed-placeholder-mention").remove();

				const renderedMessage = renderEmbeddedTags(data);
				feedList.prepend(Mustache.render(mentionTemplate, renderedMessage));
				if (data.Sender != currentUserHandle) {
					const isActive = $("#feed-tabs-mention-nav").hasClass("active");
					if (isActive == false) {
						const unreadLabel = $("#feed-tab-unread-mention");
						unreadLabel.text(Number(unreadLabel.text()) + 1).show();
					}
				}
			}
		}
	};

	const addNewFollowMessage = (data) => {
		if (!Settings.MuteUsers.includes(data.Sender)) {
			data.TimeElapsed = moment.utc(data.Timestamp).fromNow();
			const feedList = $("#feed-messages-friends");
			if (feedList.find(".message-id-" + data.Id).length == 0) {
				$("#feed-placeholder-friends").remove();

				const renderedMessage = renderEmbeddedTags(renderedMessage);
				feedList.prepend(Mustache.render(friendsTemplate, data));
				if (data.Sender != currentUserHandle) {
					const isActive = $("#feed-tabs-friends-nav").hasClass("active");
					if (isActive == false) {
						const unreadLabel = $("#feed-tab-unread-friends");
						unreadLabel.text(Number(unreadLabel.text()) + 1).show();
					}
				}
			}
		}
	}

	const displayError = (data) => {
		$("#toast-container").prepend($(Mustache.render(toastTemplate, { Header: "Error", Content: data })).toast('show'));
	}


	const createTrending = (data) => {
		$("#trending-hives").empty();
		$("#hive-totalcount").text(data.Total);
		for (let hive of data.Hives) {
			if (!Settings.MuteHives.includes(hive)) {
				updateTrendingCount(hive);
			}
		}
		updateTrendingOrder();
	}

	const updateTrending = (data) => {
		$("#hive-totalcount").text(data.Total);
		if (!Settings.MuteHives.includes(data.Hive)) {
			updateTrendingCount(data)
			updateTrendingOrder();
		}
	}

	const updateTrendingCount = (hive) => {
		const existing = $("#hive-" + hive.Hive);
		if (existing.length > 0) {
			if (hive.Count > 0) {
				existing.attr("data-order", hive.Count).find(".trendinghive-count").text(hive.Count);
			}
			else {
				existing.remove();
			}
		}
		else {
			const count = $("#trending-hives > li").length;
			if (count < 15) {
				$("#trending-hives").prepend(Mustache.render(trendingHiveTemplate, hive));
			}
		}
	}

	const updateTrendingOrder = () => {
		$('#trending-hives li').sort(function (a, b) {
			return (b.dataset.order - a.dataset.order) || a.dataset.hive.localeCompare(b.dataset.hive);
		}).appendTo('#trending-hives');
	}


	const subscribeHives = async () => {
		for (let hive of Settings.MyHives) {
			await joinHive(hive);
		}
	}

	const renderMessageCache = () => {
		if (MessageCache.Enabled == true) {
			for (const message of MessageCache.GetMessages()) {
				addNewMessage(message, false);
			}
		}
	}

	const updateConnectionState = (connected) => {
		$("#connection-status")
			.removeClass("text-success text-danger")
			.addClass(connected == true ? "text-success" : "text-danger");
	}


	const followUser = async (userHandle) => {
		if (userHandle == currentUserHandle) {
			return;
		}
		const result = await hiveHub.server.followUser(userHandle);
		if (result == true) {
			FollowCache.AddFollower(userHandle);
			const followList = $("#following-list");
			followList.find(".empty-list-template").remove();
			followList.prepend(Mustache.render(followingTemplate, userHandle));
		}
	}

	const unfollowUser = async (userHandle) => {
		if (userHandle == currentUserHandle) {
			return;
		}
		const result = await hiveHub.server.unfollowUser(userHandle);
		if (result == true) {
			FollowCache.RemoveFollower(userHandle);
			const followList = $("#following-list");
			followList.find(".following-" + userHandle).remove();
			if (followList.find("li").length == 0) {
				followList.append(Mustache.render(emptyListTemplate, "You are not following anyone"));
			}
		}
	}

	const subscribeFollowers = async () => {
		$("#following-list, #follower-list").empty();
		const result = await hiveHub.server.subscribeFollowers(FollowCache.GetFollowers());
		const followingList = $("#following-list");
		for (const follower of result.Following) {
			if (followingList.find(".follower-" + follower).length == 0) {
				followingList.prepend(Mustache.render(followingTemplate, follower));
			}
		}

		const followerList = $("#follower-list");
		for (const follower of result.Followers) {
			if (Settings.MuteUsers.includes(follower) == false) {
				if (followerList.find(".follower-" + follower).length == 0) {
					followerList.prepend(Mustache.render(followerTemplate, follower));
				}
			}
		}

		if (followerList.find("li").length == 0) {
			followerList.append(Mustache.render(emptyListTemplate, "You have no followers online"));
		}
		if (followingList.find("li").length == 0) {
			followingList.append(Mustache.render(emptyListTemplate, "You are not following anyone"));
		}
	};

	const updateFollowers = (data) => {
		const followList = $("#follower-list");
		if (data.Action == "Add" && followList.find(".follower-" + data.UserHandle).length == 0) {
			followList.find(".empty-list-template").remove();
			followList.prepend(Mustache.render(followerTemplate, data.UserHandle));
		}
		if (data.Action == "Remove") {
			followList.find(".follower-" + data.UserHandle).remove();
			if (followList.find("li").length == 0) {
				followList.append(Mustache.render(emptyListTemplate, "You have no followers online"));
			}
		}
	}

	const hiveHub = $.connection.hiveHub;
	$.connection.hub.reconnected(async function () {
		updateConnectionState(true);
		console.log("reconnected")
		await subscribeHives();
	});
	$.connection.hub.reconnecting(async function () {
		updateConnectionState(false);
		console.log("reconnecting")
	});
	$.connection.hub.disconnected(async function () {
		updateConnectionState(false);
		console.log("disconnected")
	});


	hiveHub.client.OnError = function (data) {
		displayError(data);
	};
	hiveHub.client.OnMessage = function (data) {
		addNewMessage(data, true);
		MessageCache.AddMessage(data);
	};
	hiveHub.client.OnMention = function (data) {
		addNewMentionMessage(data);
	};
	hiveHub.client.OnFollow = function (data) {
		addNewFollowMessage(data);
	};
	hiveHub.client.OnHiveUpdate = function (data) {
		updateTrending(data);
	};
	hiveHub.client.OnTrending = function (data) {
		createTrending(data);
	};
	hiveHub.client.OnFollowUpdate = function (data) {

		updateFollowers(data);
	};

	//Startup
	await $.connection.hub.start({ transport: ['webSockets'] });
	updateConnectionState(true);
	await subscribeFollowers();
	await subscribeHives();
	await renderMessageCache();



	$("#trending-hives").on("click", ".trendinghive-join", async function () {
		await joinHive($(this).data("hive").toString());
	});

	$("#trending-hives").on("click", ".trendinghive-mute", async function () {
		const hiveName = $(this).data("hive").toString();
		await leaveHive(hiveName);
		Settings.MuteHive(hiveName);
		$("#hive-" + hiveName).remove();
	});

	$("#myhive-hives").on("click", ".myhive-leave", async function () {
		await leaveHive($(this).data("hive").toString());
	});


	$("#joinhive-btn").on("click", async function () {
		const hiveName = $("#hive-input").val().toString();
		Settings.UnmuteHive(hiveName);
		await joinHive(hiveName);
	});

	$("#leavehive-btn").on("click", async function () {
		const hiveName = $("#hive-input").val();
		await leaveHive(hiveName);
	});

	const openMessageContainer = () => {
		$("#feed-message-myhives")
			.addClass("feed-message-content-expanded")
			.removeAttr("placeholder")
			.next(".feed-message-footer")
			.show();
	};

	const closeMessageContainer = () => {
		$("#feed-message-myhives")
			.removeClass("feed-message-content-expanded")
			.val(null)
			.attr("placeholder", "Whats on your mind?")
			.next(".feed-message-footer")
			.hide();
	};

	$("#feed-message-option-hives").val(Settings.LastSelectedHive);

	$("#feed-content").on("click", ".feed-message-btn", async function () {
		const button = $(this);
		const messageBox = $("#feed-message-myhives");


		const selectedHive = $("#feed-message-option-hives").val();
		let hiveTargets = selectedHive;
		if (hiveTargets.length == 0) {
			hiveTargets = Settings.MyHives.join();
		}

		const message = messageBox.val();
		if (message.length > 0) {
			await hiveHub.server.sendMessage(message, hiveTargets);
			closeMessageContainer();
			if (selectedHive != Settings.LastSelectedHive) {
				Settings.LastSelectedHive = selectedHive;
				Settings.Save();
			}
		}
	});


	$("#feed-content").on("focusin", ".feed-message-content", function () {
		openMessageContainer();
	});

	$("#feed-content").on("click", ".feed-message-cancel", function () {
		closeMessageContainer();
	});

	$("#feed-content").on("input", ".feed-message-content", function () {
		const _this = $(this);
		const message = _this.val();
		const sendAll = _this.next(".feed-message-footer").find(".switchbox");
		if (message.length > 0) {
			sendAll.removeClass("disabled");
		}
		else {
			sendAll.addClass("disabled");
		}
	});

	$("#feed-content").on("click", ".message-hivetag", function () {
		const _this = $(this);
		const hiveName = _this.text();
		$("#hive-input").val(hiveName);
	});

	$("#feed-content").on("click", ".message-muteuser", async function () {
		const _this = $(this);
		const userName = _this.data("user").toString();
		if (currentUserHandle != userName) {
			Settings.MuteUser(userName);
			await unfollowUser(userName);
			$("#feed-content .message-sender-" + userName).remove();
		}
	});

	$("#feed-content").on("click", ".message-mute", function () {
		const message = $(this).parents("li");
		const messageId = message.data("messageid");
		message.remove();
		MessageCache.RemoveMessage(messageId);
	});


	const rebuildSettings = () => {
		$("#settings-messagestore-max").val(MessageCache.MaxCount);
		$("#settings-messagestore-enabled").prop('checked', MessageCache.Enabled);
		$("#settings-messagestore-global-enabled").prop('checked', MessageCache.EnabledGlobal);

		$("#settings-render-link").prop("checked", Settings.RenderLinks);
		$("#settings-render-followlink").prop("checked", Settings.RenderLinksFollowOnly);

		$("#settings-mutedusers, #settings-mutedhives").empty();
		if (Settings.MuteUsers.length == 0) {
			$("#settings-mutedusers").prepend(Mustache.render(emptyListTemplate, "No muted users"));
		}
		else {
			for (let user of Settings.MuteUsers) {
				$("#settings-mutedusers").prepend(Mustache.render(settingMuteUserTemplate, user));
			}
		}

		if (Settings.MuteHives.length == 0) {
			$("#settings-mutedhives").prepend(Mustache.render(emptyListTemplate, "No muted hives"));
		}
		else {
			for (let hive of Settings.MuteHives) {
				$("#settings-mutedhives").prepend(Mustache.render(settingMuteHiveTemplate, hive));
			}
		}
	}

	$(".section-option, #section-header-settings").on("click", function () {
		$(".main-container-desktop .section-left").toggle();
		rebuildSettings();
	})

	$("#section-settings").on("click", ".settings-remove-user", function () {
		const userName = $(this).data("user").toString();
		Settings.UnmuteUser(userName);
		rebuildSettings();
	});

	$("#section-settings").on("click", ".settings-remove-hive", function () {
		Settings.UnmuteHive($(this).data("hive").toString());
		rebuildSettings();
	});

	$("#settings-messagestore-save").on("click", function () {
		MessageCache.Enabled = $("#settings-messagestore-enabled").is(":checked");
		MessageCache.EnabledGlobal = $("#settings-messagestore-global-enabled").is(":checked");
		MessageCache.MaxCount = Math.max(0, Number($("#settings-messagestore-max").val()));
		MessageCache.Update();

		Settings.RenderLinks = $("#settings-render-link").is(":checked");
		Settings.RenderLinksFollowOnly = $("#settings-render-followlink").is(":checked");
		Settings.Save();
	});

	$("#settings-messagestore-clear").on("click", function () {
		Settings.Clear();
		MessageCache.Clear();
		location.reload();
	});


	setInterval(function () {
		$(".time-elapsed").each(function () {
			const _this = $(this);
			_this.text(moment.utc(_this.data("time")).fromNow());
		})
	}, 10000);


	$("#feed-tabs").on("click", ".nav-item", function () {
		$(this).find(".badge").text("0").hide();
	});


	$("#main-container").on("click", ".message-followuser", async function () {
		const userHandle = $(this).data("user").toString();
		if (userHandle != currentUserHandle) {
			await followUser(userHandle);
		}
	});

	$("#main-container").on("click", ".message-unfollowuser", async function () {
		const userHandle = $(this).data("user").toString();
		if (userHandle != currentUserHandle) {
			await unfollowUser(userHandle);
		}
	});

})(jQuery);