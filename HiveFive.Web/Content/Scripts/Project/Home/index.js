﻿(async ($) => {

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
	const hiveDropDownOptionTemplate = $("#hiveDropDownOptionTemplate").html();
	const createHiveModalTemplate = $("#createHiveModalTemplate").html();

	const linkifyImgurLink = $("#linkifyImgurLink").html();
	const linkifyImgurRegexp = /https?:\/\/(?:www\.)?(?:i\.)?imgur\.com\/(?:a|gallery)?\/?(?:[\w+]+)\.([\w+]{3,})/;
	const linkifyRedditRegexp = /https:\/\/(?:preview|external-preview|i).redd.it\/(?:[\w+-]+)\.([\w+]{3,})(?:[\w+=&?]+)?/;

	const linkifyYoutubeLink = $("#linkifyYoutubeLink").html();
	const linkifyYoutubeRegexp = /.*(?:youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=)([^#\&\?]*).*/;

	const linkify = (text) => {

		if (text.match(linkifyImgurRegexp)) {
			const match = linkifyImgurRegexp.exec(text);
			const isVideo = ["mp4", "webem", "gifv"].includes(match[1]);
			return Mustache.render(linkifyImgurLink, { src: match[0].replace(".gifv", ".mp4"), isVideo: isVideo });
		}

		if (text.match(linkifyRedditRegexp)) {
			const match = linkifyRedditRegexp.exec(text);
			const isVideo = ["mp4", "webem", "gifv"].includes(match[1]);
			return Mustache.render(linkifyImgurLink, { src: match[0], isVideo: isVideo });
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
				$("#myhive-hives").prepend(Mustache.render(myHiveTemplate, { Hive: hiveName }));
				if (hive != "hive") {
					$("#feed-message-option-hives, #feed-message-filter").append(Mustache.render(hiveDropDownOptionTemplate, hiveName));
				}
				sortList("#myhive-hives");
				sortList("#feed-message-filter");
				sortList("#feed-message-option-hives");
			}
		}
	}

	const leaveHive = async (hive) => {
		const hiveName = getHiveName(hive);
		const result = await hiveHub.server.leaveHive(hiveName);
		if (result == true) {
			Settings.RemoveMyHive(hiveName);

			$("#myhive-" + hive).remove();
			$(".hive-option-" + hive).remove();
			// TODO: find all messages in hive and remove from cache and ui
		}
	}


	const subscribeHives = async () => {
		const result = await hiveHub.server.subscribeHives(Settings.MyHives);
		for (let hive of result) {
			const existingHive = $("#myhive-" + hive);
			if (existingHive.length == 0) {
				$("#myhive-hives").prepend(Mustache.render(myHiveTemplate, { Hive: hive }));
				if (hive != "hive") {
					$("#feed-message-option-hives, #feed-message-filter").append(Mustache.render(hiveDropDownOptionTemplate, hive));
				}
			}
		}
		sortList("#myhive-hives");
		sortList("#feed-message-filter");
		sortList("#feed-message-option-hives");
	}

	const getHiveName = (hive) => {
		return hive.replace("#", "").trim().toLowerCase();
	}


	const addNewMessage = (data, updateUnread) => {
		const feedList = $("#feed-messages-myhives");
		if (feedList.find(".message-id-" + data.Id).length == 0) {
			$("#feed-placeholder-myhives").hide();

			const renderedMessage = renderEmbeddedTags(data);
			feedList.prepend(Mustache.render(messageTemplate, renderedMessage));
			$('#feed-message-filter').trigger("change");

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

	const addNewMentionMessage = (data, updateUnread) => {
		const feedList = $("#feed-messages-mention");
		if (feedList.find(".message-id-" + data.Id).length == 0) {
			$("#feed-placeholder-mention").hide();

			const renderedMessage = renderEmbeddedTags(data);
			feedList.prepend(Mustache.render(mentionTemplate, renderedMessage));
			if (updateUnread) {
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

	const addNewFollowMessage = (data, updateUnread) => {
		const feedList = $("#feed-messages-friends");
		if (feedList.find(".message-id-" + data.Id).length == 0) {
			$("#feed-placeholder-friends").hide();

			const renderedMessage = renderEmbeddedTags(data);
			feedList.prepend(Mustache.render(friendsTemplate, renderedMessage));
			if (updateUnread) {
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

	const renderMessage = (data, updateUnread) => {
		if (!Settings.MuteUsers.includes(data.Sender)) {

			//TODO: upgrade remove later
			if (data.MessageType == undefined) {
				data.MessageType = ["Feed"];
			}

			data.TimeElapsed = moment.utc(data.Timestamp).fromNow();
			if (data.MessageType.includes("Feed")) {
				addNewMessage(data, updateUnread);
			}
			if (data.MessageType.includes("Follow")) {
				addNewFollowMessage(data, updateUnread);
			}
			if (data.MessageType.includes("Mention")) {
				addNewMentionMessage(data, updateUnread);
			}
		}
	}

	const displayError = (data) => {
		$("#toast-container").prepend($(Mustache.render(toastTemplate, data)).toast('show'));
	}


	const getTrendingHives = async () => {
		$("#trending-hives").empty();
		const result = await hiveHub.server.getTrending();
		for (let hive of result) {
			if (!Settings.MuteHives.includes(hive)) {
				updateTrendingCount(hive);
			}
		}
		updateTrendingOrder();
	}

	const updateTrending = (data) => {
		$(".hive-totalcount").text(data.Total);
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

	const sortList = (list) => {
		$(list).find("li, option").sort(function (a, b) {
			return a.dataset.sort.localeCompare(b.dataset.sort);
		}).appendTo(list);
	}


	const renderMessageCache = () => {
		$("#feed-messages-myhives, #feed-messages-mention, #feed-messages-friends").empty();
		if (MessageCache.Enabled == true) {
			for (const message of MessageCache.GetMessages()) {
				if (message.IsDeleted === true) {
					continue;
				}
				message.Message = message.Message.substring(0, 240);
				renderMessage(message, false);
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
			sortList("#following-list");
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

		sortList("#follower-list");
		sortList("#following-list");
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
		sortList("#follower-list");
	}




	const hiveHub = $.connection.hiveHub;
	$.connection.hub.reconnected(async function () {
		updateConnectionState(true);
		await getTrendingHives();
		await subscribeFollowers();
		await subscribeHives();
		await requestSync();
	});
	$.connection.hub.reconnecting(async function () {
		updateConnectionState(false);
	});
	$.connection.hub.disconnected(async function () {
		updateConnectionState(false);
	});


	hiveHub.client.OnError = function (data) {
		displayError(data);
	};
	hiveHub.client.OnMessage = function (data) {
		renderMessage(data, true);
		MessageCache.Add(data);
	};

	hiveHub.client.OnHiveUpdate = function (data) {
		updateTrending(data);
	};
	hiveHub.client.OnFollowUpdate = function (data) {
		updateFollowers(data);
	};

	hiveHub.client.OnSyncRequest = function (data) {
		processSyncRequest(data)
	};

	hiveHub.client.OnSyncResponse = function (data) {
		processSyncResponse(data);
	};


	let currentSyncRequest;
	let currentSyncTimeout;

	const processSyncRequest = async (request) => {
		if (MessageCache.AllowSync === true) {
			console.log("[MessageSync]  - Received sync request from " + request.UserId);
			const messages = MessageCache.GetSyncMessages(request);
			const data = {
				UserId: request.UserId,
				SyncId: request.SyncId,
				Messages: messages
			};
			console.log("[MessageSync]  - Sending sync response to " + data.UserId);
			await hiveHub.server.syncResponse(data);
		}
	}

	const processSyncResponse = (response) => {
		if (MessageCache.AllowSync === true) {
			console.log("[MessageSync]  - Received sync response from " + response.UserId);
			if (currentSyncRequest.SyncId !== response.SyncId) {
				return;
			}

			if (!currentSyncRequest.Candidates.includes(response.UserId)) {
				return;
			}

			const messages = [];
			for (const message of response.Messages) {
				if (!message.Hives.some(x => Settings.MyHives.includes(x))) {
					continue;
				}

				const feedTypes = ["Feed"];
				if (FollowCache.IsFollower(message.Sender)) {
					feedTypes.push("Follow");
				}
				if (message.Message.includes("@" + currentUserHandle)) {
					feedTypes.push("Mention");
				}

				message.MessageType = feedTypes;
				messages.push(message);
			}

			if (messages.length > 0) {
				MessageCache.AddRange(messages);
				renderMessageCache();
			}

			currentSyncRequest.Candidates.splice(currentSyncRequest.Candidates.indexOf(response.UserId), 1);
			if (currentSyncRequest.Candidates.length == 0) {
				completeSync();
			}
		}
	}

	const completeSync = async () => {
		if (currentSyncRequest !== undefined) {
			clearTimeout(currentSyncTimeout);
			console.log("[MessageSync]  - Completing sync", currentSyncRequest);
			await hiveHub.server.syncCompleteRequest(currentSyncRequest.SyncId);
			currentSyncRequest = undefined;
		}
	}

	const requestSync = async () => {
		if (MessageCache.AllowSync === true) {
			if (currentSyncRequest !== undefined) {
				return;
			}

			currentSyncRequest = await hiveHub.server.syncRequest({ MaxCount: MessageCache.MaxCount, CacheTime: MessageCache.GetCacheTime() });
			if (currentSyncRequest.SyncId.length == 0 || currentSyncRequest.Candidates.length == 0) {
				currentSyncRequest = undefined;
				return;
			}

			console.log("[MessageSync] - Requesting sync from followers", currentSyncRequest);
			currentSyncTimeout = setTimeout(completeSync, 10000);
		}
	}


	//Startup
	await $.connection.hub.start({ transport: ['webSockets'] });
	updateConnectionState(true);
	await getTrendingHives();
	await subscribeFollowers();
	await subscribeHives();
	await renderMessageCache();
	await requestSync();


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

	const appendToMessage = (text) => {
		const textarea = $("#feed-message-myhives");
		textarea.val((textarea.val() || "") + text);
	};

	$("#feed-message-filter").val(Settings.FeedFilter);
	$("#feed-message-option-hives").val(Settings.LastSelectedHives || Settings.MyHives);

	$("#feed-content").on("click", ".feed-message-btn", async function () {
		const messageBox = $("#feed-message-myhives");
		const message = messageBox.val();
		if (message.length == 0) {
			return;
		}

		const selectedHives = $("#feed-message-option-hives").val() || [];
		await hiveHub.server.sendMessage(Settings.Handle, message.substring(0, 240), selectedHives.join());
		closeMessageContainer();
		Settings.LastSelectedHives = selectedHives;
		Settings.Save();
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
		MessageCache.Remove(messageId);
	});


	const rebuildSettings = () => {
		$("#settings-userhandle").val(Settings.Handle || currentUserHandle);
		$("#settings-messagestore-max").val(MessageCache.MaxCount);
		$("#settings-messagestore-enabled").prop('checked', MessageCache.Enabled);
		$("#settings-messagestore-sync-enabled").prop('checked', MessageCache.AllowSync);

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

	const userHandleRegexp = /^([\w+]{2,15})$/;
	$("#settings-messagestore-save").on("click", async function () {
		const selectedHandle = $("#settings-userhandle").val();
		if (selectedHandle !== undefined && selectedHandle.length > 0) {
			if (!userHandleRegexp.test(selectedHandle)) {
				await notifyModal("Invalid User Handle", "User Handle must only contain letters, numbers and underscore, and be between 2 and 15 charcters.")
				return;
			}
			Settings.Handle = selectedHandle;
		}

		MessageCache.Enabled = $("#settings-messagestore-enabled").is(":checked");
		MessageCache.MaxCount = Math.max(0, Number($("#settings-messagestore-max").val()));
		MessageCache.AllowSync = $("#settings-messagestore-sync-enabled").is(":checked");
		MessageCache.Update();

		Settings.RenderLinks = $("#settings-render-link").is(":checked");
		Settings.RenderLinksFollowOnly = $("#settings-render-followlink").is(":checked");
		Settings.Save();
		renderMessageCache();
		await requestSync();
	});

	$("#settings-messagestore-clear").on("click", async function () {
		const result = await confirmModal("Clear Settings", "Are you sure you want to clear settings, this includes saved followers, hives and messages");
		if (result.Success === true) {
			Settings.Clear();
			MessageCache.Clear();
			location.reload();
		}
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


	$("#main-container").on("click", ".action-userhandle", function () {
		const userHandle = $(this).data("user").toString();
		openMessageContainer();
		appendToMessage("@" + userHandle);
	});

	$('#feed-message-option-hives').select2({
		maximumSelectionLength: 15,
		allowClear: true
	});

	$("#feed-message-filter").select2({
		maximumSelectionLength: 15,
		allowClear: true
	})


	$("#feed-message-filter, #feed-message-option-hives")
		.on('select2:unselecting', function () {
			$(this).data('unselecting', true);
		})
		.on('select2:opening', function (e) {
			if ($(this).data('unselecting')) {
				$(this).removeData('unselecting');
				e.preventDefault();
			}
		});

	$('#feed-message-filter').on('change', function (e) {
		const filterOptions = $(this).val();
		if (filterOptions.length == 0) {
			$("#feed-messages-myhives > .message-item").show();
			return;
		}

		$("#feed-messages-myhives > .message-item")
			.hide()
			.filter(function () {
				const messageOptions = $(this).data("filter").split(",");
				return filterOptions.length == 0 || filterOptions.some(x => messageOptions.includes(x));
			}).show();
	});

	$("#myhive-hives").on("click", " .myhive-item", function () {
		const selectedHive = $(this).data("hive").toString();
		const filterOptions = $("#feed-message-filter").val();
		const exists = filterOptions.indexOf(selectedHive);
		if (exists >= 0) {
			filterOptions.splice(exists, 1);
		} else {
			filterOptions.push(selectedHive);
		}
		$('#feed-message-filter').val(filterOptions).trigger("change");
	});

	$("#create-hive-btn").on("click", async function () {
		const result = await openTemplateModal(createHiveModalTemplate);
		if (result.Success === true) {
			await joinHive(result.HiveName);
		}
	});

})(jQuery);