using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HiveFive.Data.Entity
{

	public class UserInRole
	{
		[Key]
		public int UserId { get; set; }

		[Key]
		public int RoleId { get; set; }

		[ForeignKey("RoleId")]
		public virtual UserRole Role { get; set; }

		[ForeignKey("UserId")]
		public virtual User User { get; set; }
	}
}
