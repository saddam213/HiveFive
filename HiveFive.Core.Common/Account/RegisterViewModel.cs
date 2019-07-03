using System.ComponentModel.DataAnnotations;

namespace HiveFive.Core.Common.Account
{
	public class RegisterViewModel
	{
		[Required(ErrorMessageResourceName = nameof(Resources.Account.ValidationErrorMessageRequiredUserName), ErrorMessageResourceType = typeof(Resources.Account))]
		[RegularExpression(@"^(?!\d*$)[\w+]{2,15}$", ErrorMessageResourceName = nameof(Resources.Account.ValidationErrorMessageInvalidUserName), ErrorMessageResourceType = typeof(Resources.Account))]
		public string UserName { get; set; }

		[Required(ErrorMessageResourceName = nameof(Resources.Account.ValidationErrorMessageRequiredEmail), ErrorMessageResourceType = typeof(Resources.Account))]
		[EmailAddress(ErrorMessageResourceName = nameof(Resources.Account.ValidationErrorMessageInvalidEmail), ErrorMessageResourceType = typeof(Resources.Account))]
		public string Email { get; set; }

		[Required(ErrorMessageResourceName = nameof(Resources.Account.ValidationErrorMessageRequiredPassword), ErrorMessageResourceType = typeof(Resources.Account))]
		[StringLength(100, ErrorMessageResourceName = nameof(Resources.Account.ValidationErrorMessageInvalidPasswordLength), MinimumLength = 6, ErrorMessageResourceType = typeof(Resources.Account))]
		[DataType(DataType.Password)]
		public string Password { get; set; }

		[DataType(DataType.Password)]
		[Compare(nameof(Password), ErrorMessageResourceName = nameof(Resources.Account.ValidationErrorMessageInvalidPasswordCompare), ErrorMessageResourceType = typeof(Resources.Account))]
		public string ConfirmPassword { get; set; }

		//[RequiredToBeTrue(ErrorMessageResourceName = nameof(Resources.Account.ValidationErrorMessageInvalidAcceptTerms), ErrorMessageResourceType = typeof(Resources.Account))]
		//public bool AcceptTerms { get; set; }
	}
}
