using System;

namespace HiveFive.Framework.Extensions
{
	public static class DecimalExtensions
	{
		public static decimal TruncateDecimal(this decimal value, int precision = 8)
		{
			decimal step = (decimal)Math.Pow(10, precision);
			decimal tmp = Math.Truncate(step * value);
			return tmp / step;
		}

		public static decimal ToSatoshi(this decimal value)
		{
			return 0.00000000m + value.TruncateDecimal();
		}
	}
}
