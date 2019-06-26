(async ($) => {

	$("#Type").on('change', function () {
		const _this = $(this);
		clearMessage();
		$(".data-input-email, .data-input-otp, .data-input-pincode, .data-input-none").hide();
		const selection = _this.val();
		if (selection === '0') {
			$(".data-input-none").show();
		}
		if (selection === '1') {
			$(".data-input-email").show();
		}
		if (selection === '2') {
			$(".data-input-otp").show();
		}
		if (selection === '3') {
			$(".data-input-pincode").show();
		}
	}).trigger('change');


	$("#send-email").on('click', async function () {
		clearMessage();
		const _this = $(this);
		const email = $("#DataEmail").val();
		if (email) {
			const action = _this.data('action');
			const error = _this.data('error');
			const success = _this.data('success');
			//$.blockUI({ message: 'Sending...' });
			const data = await postJson(action, { dataEmail: email });
			//$.unblockUI();
			if (data.Success) {
				showSuccess(success);
				return;
			}
			showError(error);
		}
	});

	$("#verify-email").on('click', async function () {
		clearMessage();
		const _this = $(this);
		const code = $("#code-email").val();
		if (code) {
			const action = _this.data('action');
			const error = _this.data('error');
			const success = _this.data('success');
			const data = await postJson(action, { code: code });
			if (data.Success) {
				showSuccess(success);
				return;
			}
			showError(error);
		}
	});

	$("#verify-otp").on('click', async function () {
		clearMessage();
		const _this = $(this);
		const code = $("#code-otp").val();
		if (code) {
			const key = _this.data('key');
			const action = _this.data('action');
			const error = _this.data('error');
			const success = _this.data('success');
			const data = await postJson(action, { key: key, code: code });
			if (data.Success) {
				showSuccess(success);
				return;
			}
			showError(error);
		}
	});

	var authQrcode = $("#qr-code");
	var qrcodeData = authQrcode.data('code');
	if (qrcodeData) {
		authQrcode.qrcode({ text: qrcodeData });
	}

})(jQuery);

function clearMessage() {
	$('#message > p').text('');
	$('#message').removeClass("alert-success alert-danger").hide();
}

function showError(message) {
	$('#message > p').text(message);
	$('#message').addClass("alert-danger").show();
}

function showSuccess(message) {
	$('#message > p').text(message);
	$('#message').addClass("alert-success").show();
}