﻿using System.ComponentModel;
using System.Configuration.Install;
using System.ServiceProcess;

namespace HiveFive.EmailService
{
	[RunInstaller(true)]
	public class WindowsServiceInstaller : Installer
	{
		/// <summary>
		/// Public Constructor for WindowsServiceInstaller.
		/// - Put all of your Initialization code here.
		/// </summary>
		public WindowsServiceInstaller()
		{
			var serviceProcessInstaller = new ServiceProcessInstaller();
			var serviceInstaller = new ServiceInstaller();

			//# Service Account Information
			serviceProcessInstaller.Account = ServiceAccount.LocalService;

			//# Service Information
			serviceInstaller.DisplayName = "HiveFive Email Service";
			serviceInstaller.StartType = ServiceStartMode.Manual;
			serviceInstaller.Description = "Service for sending emails";
			//# This must be identical to the WindowsService.ServiceBase name
			//# set in the constructor of WindowsService.cs
			serviceInstaller.ServiceName = "HiveFive.EmailService";
			Installers.Add(serviceProcessInstaller);
			Installers.Add(serviceInstaller);
		}
	}
}