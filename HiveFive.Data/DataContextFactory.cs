using System.Data;
using System.Data.SqlClient;
using HiveFive.Data.Common;

namespace HiveFive.Data
{
	public class DataContextFactory : IDataContextFactory
	{
		public IDbConnection CreateConnection()
		{
			return new SqlConnection(ConnectionString.DefaultConnection);
		}

		public IDataContext CreateContext()
		{
			return new DataContext();
		}

		public IDataContext CreateReadOnlyContext()
		{
			var context = new DataContext();
			context.Configuration.AutoDetectChangesEnabled = false;
			context.Configuration.LazyLoadingEnabled = false;
			context.Configuration.ProxyCreationEnabled = false;
			return context;
		}
	}
}
