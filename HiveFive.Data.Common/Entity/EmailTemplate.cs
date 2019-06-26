using HiveFive.Enums;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HiveFive.Data.Entity
{
	public class EmailTemplate
	{
		[DatabaseGenerated(DatabaseGeneratedOption.Identity)]
		public int Id { get; set; }
		public EmailTemplateType Type { get; set; }
		public string Culture { get; set; }
		public string Subject { get; set; }
		public string FromAddress { get; set; }
		public string Parameters { get; set; }
		public string Template { get; set; }
		public string TemplateHtml { get; set; }
		public bool IsEnabled { get; set; }
	}
}