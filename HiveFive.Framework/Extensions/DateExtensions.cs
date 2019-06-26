using System;
using System.Globalization;

namespace HiveFive.Framework.Extensions
{
	public static class DateExtensions
	{
		public static readonly DateTime UnixEpoch = new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc);
		public static string ElapsedTime(this DateTime dtEvent, string postfix = "ago", string prefix = "")
		{
			var TS = DateTime.UtcNow - dtEvent;
			var intYears = DateTime.UtcNow.Year - dtEvent.Year;
			var intMonths = DateTime.UtcNow.Month - dtEvent.Month;
			var intDays = DateTime.UtcNow.Day - dtEvent.Day;
			var intHours = DateTime.UtcNow.Hour - dtEvent.Hour;
			var intMinutes = DateTime.UtcNow.Minute - dtEvent.Minute;
			var intSeconds = DateTime.UtcNow.Second - dtEvent.Second;
			if (intYears > 0)
				return string.Format("{0}{1} {2} {3}", prefix, intYears, intYears == 1 ? "year" : "years", postfix);
			if (intMonths > 0)
				return string.Format("{0}{1} {2} {3}", prefix, intMonths, intMonths == 1 ? "month" : "months", postfix);
			if (intDays > 0)
				return string.Format("{0}{1} {2} {3}", prefix, intDays, intDays == 1 ? "day" : "days", postfix);
			if (intHours > 0)
				return string.Format("{0}{1} {2} {3}", prefix, intHours, intHours == 1 ? "hour" : "hours", postfix);
			if (intMinutes > 0)
				return string.Format("{0}{1} {2} {3}", prefix, intMinutes, intMinutes == 1 ? "minute" : "minutes", postfix);
			if (intSeconds > 0)
				return string.Format("{0}{1} {2} {3}", prefix, intSeconds, intSeconds == 1 ? "second" : "seconds", postfix);
			return string.Format("{0}{1} {2} {3}", prefix, dtEvent.ToShortDateString(), dtEvent.ToShortTimeString(), postfix);
		}

		public static DateTime RoundToNearestInterval(this DateTime dt, TimeSpan d)
		{
			var f = 0;
			var m = (double) (dt.Ticks % d.Ticks) / d.Ticks;
			if (m >= 0.5)
				f = 1;
			return new DateTime((dt.Ticks / d.Ticks + f) * d.Ticks);
		}


		public static long ToUnixTime(this DateTime date)
		{
			var timeSpan = date - UnixEpoch;
			return (long) timeSpan.TotalSeconds;
		}

		public static long ToJavaTime(this DateTime date)
		{
			var timeSpan = date - UnixEpoch;
			return (long) timeSpan.TotalMilliseconds;
		}

		public static DateTime ToDateTime(this uint time)
		{
			return UnixEpoch.AddSeconds(time);
		}

		public static DateTime ToDateTime(this long time)
		{
			return UnixEpoch.AddSeconds(time);
		}

		public static string GetTimeToGo(this DateTime end)
		{
			if (end > DateTime.UtcNow)
			{
				var timespan = end - DateTime.UtcNow;
				if (timespan.TotalDays > 0)
					return new TimeSpan(timespan.Days, timespan.Hours, 0, 0).ToReadableString();
				if (timespan.TotalHours > 0)
					return new TimeSpan(timespan.Days, timespan.Hours, timespan.Minutes, 0).ToReadableString();
				return timespan.ToReadableString();
			}

			return string.Empty;
		}

		public static string ToReadableString(this TimeSpan span)
		{
			var formatted = string.Format("{0}{1}{2}{3}",
				span.Duration().Days > 0 ? string.Format("{0:0} day{1}, ", span.Days, span.Days == 1 ? string.Empty : "s") : string.Empty,
				span.Duration().Hours > 0 ? string.Format("{0:0} hour{1}, ", span.Hours, span.Hours == 1 ? string.Empty : "s") : string.Empty,
				span.Duration().Minutes > 0 ? string.Format("{0:0} minute{1}, ", span.Minutes, span.Minutes == 1 ? string.Empty : "s") : string.Empty,
				span.Duration().Seconds > 0 ? string.Format("{0:0} second{1}", span.Seconds, span.Seconds == 1 ? string.Empty : "s") : string.Empty);

			if (formatted.EndsWith(", "))
				formatted = formatted.Substring(0, formatted.Length - 2);

			if (string.IsNullOrEmpty(formatted))
				formatted = "0 seconds";

			return formatted;
		}

		public static string ToReadableStringShort(this TimeSpan span)
		{
			var formatted = string.Format("{0}{1}{2}{3}",
				span.Duration().Days > 0 ? string.Format("{0:0}d,", span.Days) : string.Empty,
				span.Duration().Hours > 0 ? string.Format("{0:0}h,", span.Hours) : string.Empty,
				span.Duration().Minutes > 0 ? string.Format("{0:0}m,", span.Minutes) : string.Empty,
				span.Duration().Seconds > 0 ? string.Format("{0:0}s", span.Seconds) : string.Empty);

			return !string.IsNullOrEmpty(formatted)
				? formatted.TrimEnd(',')
				: "0s";
		}

		public static int WeekOfYear(this DateTime dateTime)
		{
			return CultureInfo.CurrentCulture.Calendar.GetWeekOfYear(dateTime, CalendarWeekRule.FirstFourDayWeek, DayOfWeek.Monday);
		}

		public static DateTime StartOfWeek(this DateTime dt, DayOfWeek startOfWeek)
		{
			var diff = dt.DayOfWeek - startOfWeek;
			if (diff < 0)
				diff += 7;
			return dt.AddDays(-1 * diff).Date;
		}

		public static DateTime StartOfMonth(this DateTime dt)
		{
			return new DateTime(dt.Year, dt.Month, 1);
		}

		public static DateTime RoundUp(this DateTime dt, TimeSpan d)
		{
			var modTicks = dt.Ticks % d.Ticks;
			var delta = modTicks != 0 ? d.Ticks - modTicks : 0;
			return new DateTime(dt.Ticks + delta, dt.Kind);
		}

		public static DateTime RoundDown(this DateTime dt, TimeSpan d)
		{
			var delta = dt.Ticks % d.Ticks;
			return new DateTime(dt.Ticks - delta, dt.Kind);
		}

		public static DateTime RoundToNearest(this DateTime dt, TimeSpan d)
		{
			var delta = dt.Ticks % d.Ticks;
			var roundUp = delta > d.Ticks / 2;
			var offset = roundUp ? d.Ticks : 0;

			return new DateTime(dt.Ticks + offset - delta, dt.Kind);
		}
	}
}