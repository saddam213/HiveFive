using System;
using System.Collections.Generic;
using System.Configuration;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HiveFive.Data.Common
{
	public static class ConnectionString
	{
		public static string DefaultConnection
		{
			get
			{
				var defaultConnection = ConfigurationManager.ConnectionStrings["DefaultConnection"];
				if (defaultConnection != null)
					return defaultConnection.ConnectionString;

				return string.Empty;
			}
		}
	}
}
