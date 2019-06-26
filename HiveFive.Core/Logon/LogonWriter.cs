using System.Data;
using System.Threading.Tasks;
using Dapper;
using HiveFive.Core.Common.Logon;
using HiveFive.Data.Common;

namespace HiveFive.Core.Logon
{
	public class LogonWriter : ILogonWriter
	{
		public IDataContextFactory DataContextFactory { get; set; }

		public async Task<bool> AddLogon(AddLogonModel model)
		{
			using (var connection = DataContextFactory.CreateConnection())
			{
				var loginId = await connection.QueryFirstOrDefaultAsync<long>(StoredProcedure.Core_UserLogon_Insert, new
				{
					UserId = model.UserId,
					IpAddress = model.IPAddress,
					UserAgent = model.UserAgent,
					Device = model.Device,
					Location = model.Location,
					Type = model.Type
				}, commandType: CommandType.StoredProcedure);
				return loginId > 0;
			}
		}
	}
}
