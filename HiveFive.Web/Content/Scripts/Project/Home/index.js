(async ($) => {

	Settings.UnmuteUser(currentUserHandle);

	const toastTemplate = $("#toastTemplate").html();
	const mentionTemplate = $("#mentionTemplate").html();
	const messageTemplate = $("#messageTemplate").html();
	const hiveTabTemplate = $("#hiveTabTemplate").html();
	const hiveTabContentTemplate = $("#hiveTabContentTemplate").html();
	const trendingHiveTemplate = $("#trendingHiveTemplate").html();
	const myHiveTemplate = $("#myHiveTemplate").html();
	const settingMuteHiveTemplate = $("#settingMuteHiveTemplate").html();
	const settingMuteUserTemplate = $("#settingMuteUserTemplate").html();



	const addHiveTab = (hive) => {
		const existingTab = $("#hivetab-tab-" + hive);
		if (existingTab.length == 0) {
			$("#hive-tabs .nav-link").removeClass("active");
			$("#hive-content .active").removeClass("show active");
			$("#hive-tabs").prepend(Mustache.render(hiveTabTemplate, { Hive: hive }));
			$("#hive-content").prepend(Mustache.render(hiveTabContentTemplate, { Hive: hive }));
			$("#myhive-hives").prepend(Mustache.render(myHiveTemplate, { Hive: hive }));
		}
	}

	const removeHiveTab = (hive) => {
		const tab = $("#hivetab-tab-" + hive);
		const content = $("#hivetab-content-" + hive);
		const myHive = $("#myhive-" + hive);
		const updateCurrent = tab.find(".nav-link").hasClass("active");
		tab.remove();
		content.remove();
		myHive.remove();
		if (updateCurrent) {
			$("#hive-tabs li:first-child > a").addClass("active");
			$("#hive-content .tab-pane:first-child").addClass("show active");
		}
	}

	const joinHive = async (hive) => {
		const hiveName = getHiveName(hive);
		const result = await hiveHub.server.joinHive(hiveName);
		if (result == true) {
			addHiveTab(hiveName);
			Settings.AddMyHive(hiveName);
		}
	}

	const leaveHive = async (hive) => {
		const hiveName = getHiveName(hive);
		const result = await hiveHub.server.leaveHive(hiveName);
		if (result == true) {
			removeHiveTab(hiveName);
			Settings.RemoveMyHive(hiveName);
		}
	}

	const getHiveName = (hive) => {
		return hive.replace("#", "").trim().toLowerCase();
	}

	const addNewMessage = (data, hiveTarget, updateUnread) => {
		if (!Settings.MuteUsers.includes(data.Sender)) {
			data.TimeElapsed = moment.utc(data.Timestamp).fromNow();
			$("#hivetab-placeholder-" + hiveTarget).remove();
			$("#hivetab-messages-" + hiveTarget).prepend(Mustache.render(messageTemplate, data));

			if (updateUnread) {
				if (data.Sender != currentUserHandle) {
					const isActive = $("#hivetab-tab-" + hiveTarget).find(".nav-link").hasClass("active");
					if (isActive == false) {
						const unreadLabel = $("#hivetab-tab-unread-" + hiveTarget);
						unreadLabel.text(Number(unreadLabel.text()) + 1).show();
					}
				}
			}
		}
	}

	const addNewMention = (data) => {
		if (!Settings.MuteUsers.includes(data.Sender)) {
			data.TimeElapsed = moment.utc(data.Timestamp).fromNow();
			$("#hivetab-placeholder-mention").remove();
			$("#messages-mention").prepend(Mustache.render(mentionTemplate, data));
			if (data.Sender != currentUserHandle) {
				const isActive = $("#hive-tabs-mention-nav").hasClass("active");
				if (isActive == false) {
					const unreadLabel = $("#hivetab-tab-mention-unread");
					unreadLabel.text(Number(unreadLabel.text()) + 1).show();
				}
			}
		};
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


	const rejoinHives = async () => {
		for (let hive of Settings.MyHives) {
			await joinHive(hive);
		}
	}

	const renderMessageCache = () => {
		if (MessageCache.Enabled == true) {
			for (const message of MessageCache.GetMessages()) {
				for (const hive of message.Hives) {
					addNewMessage(message, hive, false);
				}
			}
		}
	}

	const updateConnectionState = (connected) => {
		$("#connection-status")
			.removeClass("text-success text-danger")
			.addClass(connected == true ? "text-success" : "text-danger");
	}

	const hiveHub = $.connection.hiveHub;
	$.connection.hub.reconnected(async function () {
		updateConnectionState(true);
		console.log("reconnected")
		await rejoinHives();
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
		addNewMessage(data, data.Hive, true);
		MessageCache.AddMessage(data);
	};
	hiveHub.client.OnMention = function (data) {
		addNewMention(data);
	};
	hiveHub.client.OnHiveUpdate = function (data) {
		updateTrending(data);
	};
	hiveHub.client.OnTrending = function (data) {
		createTrending(data);
	};

	//Startup
	await $.connection.hub.start({ transport: ['webSockets'] });
	updateConnectionState(true);
	await rejoinHives();
	await renderMessageCache();


	$(".container").on("click", ".hive-message-btn", async function () {
		const button = $(this);
		let hive = button.data("hive");
		const message = $(button.data("target"));
		const sendtoAll = button.prev().find("input").is(":checked");
		if (sendtoAll) {
			hive = Settings.MyHives.join();
		}

		await hiveHub.server.sendMessage(message.val(), hive);
		message.val(null).trigger("focusout");
	});

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


	$("#hive-content").on("focusin", ".hive-message-content", function () {
		const _this = $(this);
		_this.addClass("hive-message-content-expanded").removeAttr("placeholder");
		_this.next(".hive-message-footer").show();
	});

	$("#hive-content").on("focusout", ".hive-message-content", function () {
		const _this = $(this);
		const message = _this.val();
		if (!message || message.length <= 0) {
			_this.removeClass("hive-message-content-expanded").attr("placeholder", "Whats on your mind?");
			const footer = _this.next(".hive-message-footer");
			footer.find(".switchbox").addClass("disabled");
			footer.hide();
		}
	});

	$("#hive-content").on("input", ".hive-message-content", function () {
		const _this = $(this);
		const message = _this.val();
		const sendAll = _this.next(".hive-message-footer").find(".switchbox");
		if (message.length > 0) {
			sendAll.removeClass("disabled");
		}
		else {
			sendAll.addClass("disabled");
		}
	});

	$("#hive-content").on("click", ".message-hivetag", function () {
		const _this = $(this);
		const hiveName = _this.text();
		$("#hive-input").val(hiveName);
	});

	$("#hive-content").on("click", ".message-muteuser", function () {
		const _this = $(this);
		const userName = _this.data("user").toString();
		if (currentUserHandle != userName) {
			Settings.MuteUser(userName);
			$("#hive-content .message-sender-" + userName).remove();
		}
	});

	$("#hive-content").on("click", ".message-mute", function () {
		const message = $(this).parents("li");
		const messageId = message.data("messageid");
		message.remove();
		MessageCache.RemoveMessage(messageId);
	});


	const rebuildSettings = () => {
		$("#settings-messagestore-max").val(MessageCache.MaxCount);
		$("#settings-messagestore-enabled").prop('checked', MessageCache.Enabled);
		$("#settings-messagestore-global-enabled").prop('checked', MessageCache.EnabledGlobal);

		$("#settings-mutedusers, #settings-mutedhives").empty();
		if (Settings.MuteUsers.length == 0) {
			$("#settings-mutedusers").prepend("<li><small><i>No muted users</i></small></li>");
		}
		else {
			for (let user of Settings.MuteUsers) {
				$("#settings-mutedusers").prepend(Mustache.render(settingMuteUserTemplate, user));
			}
		}

		if (Settings.MuteHives.length == 0) {
			$("#settings-mutedhives").prepend("<li><small><i>No muted hives</i></small></li>");
		}
		else {
			for (let hive of Settings.MuteHives) {
				$("#settings-mutedhives").prepend(Mustache.render(settingMuteHiveTemplate, hive));
			}
		}
	}

	$(".section-option").on("click", function () {
		$(".section-left").toggle();
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


	$("#hive-tabs").on("click", ".nav-item", function () {
		$(this).find(".badge").text("0").hide();
	});

})(jQuery);