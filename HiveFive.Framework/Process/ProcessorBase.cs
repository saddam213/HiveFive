using System;
using System.Threading;
using System.Threading.Tasks;
using HiveFive.Framework.Logging;

namespace HiveFive.Framework.Process
{
	public abstract class ProcessorBase
	{
		private static readonly Log Log = LoggingManager.GetLog(typeof(ProcessorBase));
		private readonly CancellationTokenSource _cancelToken;
		private bool _isProcessing;
		private bool _isRunning;

		protected ProcessorBase()
		{
			_cancelToken = new CancellationTokenSource();
		}

		protected CancellationToken CancellationToken
		{
			get { return _cancelToken.Token; }
		}

		protected abstract TimeSpan ProcessPeriod { get; }
		protected abstract Task Process();

		public virtual Task Start()
		{
			_isRunning = true;
			_isProcessing = true;
			return Task.Factory.StartNew(TriggerProcess, TaskCreationOptions.LongRunning);
		}

		public virtual async Task Stop()
		{
			_cancelToken.Cancel();
			_isProcessing = false;
			while (_isRunning)
				await Task.Delay(250);
		}

		protected virtual async Task TriggerProcess()
		{
			while (_isProcessing)
				try
				{
					var processStart = DateTime.UtcNow;
					await Process();
					var processTime = DateTime.UtcNow - processStart;
					if (!_isProcessing)
						break;

					var processDelay = ProcessPeriod - processTime;
					if (processDelay > TimeSpan.Zero)
						await Task.Delay(processDelay, _cancelToken.Token);
				}
				catch (TaskCanceledException)
				{
					Log.Message(LogLevel.Info, "[Process] - Process has been canceled.");
					break;
				}
				catch (Exception ex)
				{
					Log.Exception("[Process] - An exception occured.", ex);
				}

			_isRunning = false;
		}
	}
}