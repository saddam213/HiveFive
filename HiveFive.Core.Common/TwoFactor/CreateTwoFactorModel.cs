using System.ComponentModel.DataAnnotations;
using HiveFive.Enums;

namespace HiveFive.Core.Common.TwoFactor
{
	public class CreateTwoFactorModel
	{
		public TwoFactorType Type { get; set; }

		[EmailAddress]
		public string DataEmail { get; set; }

		[RegularExpression("^[0-9]{4,8}$", ErrorMessageResourceName = nameof(Resources.TwoFactor.ValidationErrorMessageInvalidPinCode), ErrorMessageResourceType = typeof(Resources.TwoFactor))]
		public string DataPin { get; set; }
		public string OtpData { get; set; }
	}
}
