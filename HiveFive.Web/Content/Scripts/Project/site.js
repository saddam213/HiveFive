let token = $('input[name="__RequestVerificationToken"]').val();
$.ajaxPrefilter(function (options, originalOptions) {
	options.async = true;
	if (options.type.toUpperCase() == "POST") {
		options.data = $.param($.extend(originalOptions.data, { __RequestVerificationToken: token }));
	}
});
$.ajaxSetup({ cache: false });

const postJson = (url, vars) => {
	return $.ajax({
		url: url,
		cache: false,
		async: true,
		type: "POST",
		dataType: 'json',
		data: vars
	});
}


const getJson = (url, vars) => {
	return $.ajax({
		url: url,
		cache: false,
		async: true,
		type: "GET",
		dataType: 'json',
		data: vars
	});
}