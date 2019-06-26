using System;

namespace HiveFive.Framework.Extensions
{
	public static class StringExtensions
	{
		public static bool IsNullOrEmpty(this string value)
		{
			return string.IsNullOrEmpty(value);
		}

		public static bool IsDigits(this string value)
		{
			if (string.IsNullOrEmpty(value))
				return false;

			foreach (var c in value)
				if (c < '0' || c > '9')
					return false;

			return true;
		}

		public static string Truncate(this string value, int maxLength)
		{
			if (string.IsNullOrEmpty(value))
				return value;

			return value.Substring(0, Math.Min(value.Length, maxLength));
		}

		public static bool HasHexPrefix(this string value)
		{
			return value.StartsWith("0x");
		}

		public static string RemoveHexPrefix(this string value)
		{
			return value.Substring(value.StartsWith("0x") ? 2 : 0);
		}
	}
}