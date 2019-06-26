using System.ComponentModel.DataAnnotations;

namespace HiveFive.Data.Entity
{
	public class UserRole
	{
		[Key]
		public int Id { get; set; }

		public string Name { get; set; }
	}
}
