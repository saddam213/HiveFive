using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HiveFive.Core.Common.Account
{
	public class ResetTwoFactorModel
	{
		[Required(ErrorMessageResourceName = nameof(Resources.Account.ValidationErrorMessageRequiredRecoveryCode), ErrorMessageResourceType = typeof(Resources.Account))]
		[RegularExpression(@"[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}", ErrorMessageResourceName = nameof(Resources.Account.ValidationErrorMessageInvalidRecoveryCode), ErrorMessageResourceType = typeof(Resources.Account))]
		public string RecoveryCode { get; set; }
		public string ReturnUrl { get; set; }
	}
}
