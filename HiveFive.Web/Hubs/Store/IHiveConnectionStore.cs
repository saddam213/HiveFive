using System.Collections.Generic;
using System.Threading.Tasks;

namespace HiveFive.Web.Hubs
{
	public interface IHiveConnectionStore
	{
		Task<int> GetCount();
		Task<int> GetCount(string hive);
		Task<string> GetHandle(string connection);

		Task LinkHandle(string handle, string connection);
		Task<IEnumerable<string>> UnlinkHandle(string handle, string connection);

		Task LinkHive(string handle, string hive);
		Task UnlinkHive(string handle, string hive);

		Task<IEnumerable<object>> GetPopularHives(int count);
		Task<IEnumerable<string>> GetHiveUsers(IEnumerable<string> hives);
	}
}