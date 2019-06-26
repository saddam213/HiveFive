using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HiveFive.Data.Common
{
	public interface IDataContextFactory
	{
		IDataContext CreateContext();
		IDataContext CreateReadOnlyContext();
		IDbConnection CreateConnection();
	}
}
