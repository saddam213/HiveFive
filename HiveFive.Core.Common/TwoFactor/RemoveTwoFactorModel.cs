using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using HiveFive.Enums;

namespace HiveFive.Core.Common.TwoFactor
{

	public class RemoveTwoFactorModel
	{
		public TwoFactorType Type { get; set; }
		public string Data { get; set; }
	}
}
