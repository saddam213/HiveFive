using System.ComponentModel.DataAnnotations;

namespace HiveFive.Core.Common.Account
{
	public class ChangePasswordViewModel
	{
		[Required(ErrorMessageResourceName = nameof(Resources.Account.ValidationErrorMessageRequiredOldPassword), ErrorMessageResourceType = typeof(Resources.Account))]
		public string OldPassword { get; set; }

		[Required(ErrorMessageResourceName = nameof(Resources.Account.ValidationErrorMessageRequiredPassword), ErrorMessageResourceType = typeof(Resources.Account))]
		[StringLength(100, ErrorMessageResourceName = nameof(Resources.Account.ValidationErrorMessageInvalidPasswordLength), MinimumLength = 6, ErrorMessageResourceType = typeof(Resources.Account))]
		public string NewPassword { get; set; }
		
		[Compare(nameof(NewPassword), ErrorMessageResourceName = nameof(Resources.Account.ValidationErrorMessageInvalidPasswordCompare), ErrorMessageResourceType = typeof(Resources.Account))]
		public string ConfirmPassword { get; set; }
	}
}
