using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using HiveFive.Framework.Extensions;

namespace HiveFive.Web.Hubs
{
	public static class HiveValidation
	{
		public static string GetHiveName(string hive, bool regex)
		{
			if (!ValidateHiveName(hive, regex))
				return string.Empty;

			return hive.TrimStart('#').Trim().ToLower();
		}

		public static bool ValidateHiveName(string hiveName, bool regex)
		{
			if (string.IsNullOrEmpty(hiveName))
				return false;
			if (hiveName.Length > 15)
				return false;
			if (!regex)
				return true;

			return Regex.IsMatch(hiveName, @"^\w+$");
		}

		public static IEnumerable<string> GetHives(string message, string hiveTargets)
		{
			var hives = new HashSet<string> { "hive" };

			if (!string.IsNullOrEmpty(hiveTargets))
			{
				foreach (var item in hiveTargets.Split(new[] { ',' }, StringSplitOptions.RemoveEmptyEntries))
				{
					var hiveName = GetHiveName(item, true);
					if (string.IsNullOrEmpty(hiveName))
						continue;
					hives.Add(hiveName);
				}
			}


			if (message.Contains("#"))
			{
				foreach (Match item in Regex.Matches(message, @"(?<!\w)#\w+"))
				{
					var hiveName = GetHiveName(item.Value, false);
					if (string.IsNullOrEmpty(hiveName))
						continue;
					hives.Add(hiveName);
				}
			}

			return hives.Take(15);
		}

		public static IEnumerable<string> GetMentions(string message)
		{
			var mentions = new HashSet<string> { };
			if (!string.IsNullOrEmpty(message))
			{
				foreach (Match item in Regex.Matches(message, @"(?<!\w)@\w+"))
				{
					mentions.Add(item.Value.TrimStart('@'));
				}
			}
			return mentions.Take(15);
		}


		public static string GetMessageId(string username, string message, long timestamp)
		{
			return Math.Abs($"{username}|{timestamp}|{message}".GetHashCode()).ToString();
		}

		public static bool ValidateUserHandle(string handle)
		{
			if (string.IsNullOrEmpty(handle))
				return false;

			if (handle.IsDigits())
				return true;

			return Regex.IsMatch(handle, @"^\w+$");
		}
	}
}