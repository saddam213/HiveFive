using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace HiveFive.Core.Common.Account
{

	public class LoginViewModel
	{
		[Required(ErrorMessageResourceName = nameof(Resources.Account.ValidationErrorMessageRequiredEmail), ErrorMessageResourceType = typeof(Resources.Account))]
		[EmailAddress(ErrorMessageResourceName = nameof(Resources.Account.ValidationErrorMessageInvalidEmail), ErrorMessageResourceType = typeof(Resources.Account))]
		public string Email { get; set; }

		//[AllowHtmlData]
		[Required(ErrorMessageResourceName = nameof(Resources.Account.ValidationErrorMessageRequiredPassword), ErrorMessageResourceType = typeof(Resources.Account))]
		public string Password { get; set; }

		//[Display(Name = "Remember me?")]
		//public bool RememberMe { get; set; }
	}
}
