using System;
using System.Collections.Generic;
using System.Collections.Specialized;
using System.Linq;

namespace HiveFive.Framework.Extensions
{
	public static class ObjectExtensions
	{
		public static string GetBytesReadable(this long value)
		{
			// Get absolute value
			var absolute_i = value < 0 ? -value : value;
			// Determine the suffix and readable value
			string suffix;
			double readable;
			if (absolute_i >= 0x1000000000000000) // Exabyte
			{
				suffix = "EB";
				readable = value >> 50;
			}
			else if (absolute_i >= 0x4000000000000) // Petabyte
			{
				suffix = "PB";
				readable = value >> 40;
			}
			else if (absolute_i >= 0x10000000000) // Terabyte
			{
				suffix = "TB";
				readable = value >> 30;
			}
			else if (absolute_i >= 0x40000000) // Gigabyte
			{
				suffix = "GB";
				readable = value >> 20;
			}
			else if (absolute_i >= 0x100000) // Megabyte
			{
				suffix = "MB";
				readable = value >> 10;
			}
			else if (absolute_i >= 0x400) // Kilobyte
			{
				suffix = "KB";
				readable = value;
			}
			else
			{
				return value.ToString("0 B"); // Byte
			}

			// Divide by 1024 to get fractional value
			readable = readable / 1024;
			// Return formatted number with suffix
			return readable.ToString("0.### ") + suffix;
		}

		public static ulong ToULong(this byte[] rowversion)
		{
			if (rowversion == null || rowversion.Length == 0)
				return 0;

			return BitConverter.ToUInt64(rowversion.Reverse().ToArray(), 0);
		}

		public static Dictionary<string, string> ToDictionary(this NameValueCollection collection)
		{
			var dictionary = new Dictionary<string, string>();
			if (collection == null || collection.Count == 0)
				return dictionary;

			foreach (var k in collection.AllKeys)
			{
				dictionary.Add(k, collection[k]);
			}
			return dictionary;
		}
	}
}