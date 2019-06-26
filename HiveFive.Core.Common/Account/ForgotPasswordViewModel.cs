using System.ComponentModel.DataAnnotations;

namespace HiveFive.Core.Common.Account
{
	public class ForgotPasswordViewModel
	{
		[Required(ErrorMessageResourceName = nameof(Resources.Account.ValidationErrorMessageRequiredEmail), ErrorMessageResourceType = typeof(Resources.Account))]
		[EmailAddress(ErrorMessageResourceName = nameof(Resources.Account.ValidationErrorMessageInvalidEmail), ErrorMessageResourceType = typeof(Resources.Account))]
		public string Email { get; set; }
	}
}
