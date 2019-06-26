using HiveFive.Enums;
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HiveFive.Data.Entity
{
	public class EmailOutbox
	{
		[Key, DatabaseGenerated(DatabaseGeneratedOption.Identity)]
		public int Id { get; set; }
		public int UserId { get; set; }
		public string UserCulture { get; set; }
		public EmailTemplateType Type { get; set; }
		public string Destination { get; set; }
		public string Parameters { get; set; }
		public EmailStatus Status { get; set; }
		public string Error { get; set; }
		public DateTime Updated { get; set; }
		public DateTime Created { get; set; }

		[ForeignKey("UserId")]
		public virtual User User { get; set; }
	}
}
