using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using HiveFive.Enums;

namespace HiveFive.Core.Common.Account
{
	public class VerifyTwoFactorModel
	{
		public TwoFactorType Type { get; set; }

		[Required(ErrorMessageResourceName = nameof(Resources.Account.ValidationErrorMessageRequiredSecurityCode), ErrorMessageResourceType = typeof(Resources.Account))]
		[RegularExpression("^[0-9]{4,8}$", ErrorMessageResourceName = nameof(Resources.Account.ValidationErrorMessageSecurityCodeNumOnly), ErrorMessageResourceType = typeof(Resources.Account))]
		public string SecurityCode { get; set; }

		public string ReturnUrl { get; set; }
	}
}
